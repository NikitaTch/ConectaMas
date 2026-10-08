using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace ConectaMas;

public sealed class CallSignalingService
{
    private readonly object gate = new();
    private readonly List<CallClient> waitingClients = [];

    public async Task HandleAsync(WebSocket socket, CancellationToken cancellationToken)
    {
        var client = new CallClient(socket);

        try
        {
            while (socket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
            {
                using var message = await ReceiveMessageAsync(socket, cancellationToken);
                if (message is null) break;

                var root = message.RootElement;
                if (!root.TryGetProperty("type", out var typeValue)) continue;

                switch (typeValue.GetString())
                {
                    case "join":
                        await JoinAsync(client, cancellationToken);
                        break;
                    case "next":
                        await NextAsync(client, cancellationToken);
                        break;
                    case "signal":
                        await ForwardSignalAsync(client, root, cancellationToken);
                        break;
                    case "leave":
                        return;
                }
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { }
        catch (WebSocketException) { }
        finally
        {
            await RemoveAsync(client);
        }
    }

    private async Task JoinAsync(CallClient client, CancellationToken cancellationToken)
    {
        CallClient? peer;
        lock (gate)
        {
            waitingClients.Remove(client);
            peer = waitingClients.FirstOrDefault(candidate =>
                !ReferenceEquals(candidate, client) &&
                candidate.Peer is null &&
                candidate.Socket.State == WebSocketState.Open);

            if (peer is null)
            {
                waitingClients.Add(client);
            }
            else
            {
                waitingClients.Remove(peer);
                client.Peer = peer;
                peer.Peer = client;
            }
        }

        if (peer is null)
        {
            await client.SendAsync(new { type = "waiting" }, cancellationToken);
            return;
        }

        await peer.SendAsync(new { type = "matched", initiator = false }, cancellationToken);
        await client.SendAsync(new { type = "matched", initiator = true }, cancellationToken);
    }

    private async Task NextAsync(CallClient client, CancellationToken cancellationToken)
    {
        CallClient? previousPeer;
        lock (gate)
        {
            waitingClients.Remove(client);
            previousPeer = client.Peer;
            client.Peer = null;
            if (previousPeer is not null) previousPeer.Peer = null;
        }

        if (previousPeer is not null)
        {
            await previousPeer.SendAsync(new { type = "peer-left" }, cancellationToken);
        }

        await JoinAsync(client, cancellationToken);
    }

    private async Task ForwardSignalAsync(CallClient client, JsonElement root, CancellationToken cancellationToken)
    {
        CallClient? peer;
        lock (gate) peer = client.Peer;
        if (peer is null || !root.TryGetProperty("signal", out var signal)) return;

        await peer.SendAsync(new { type = "signal", signal = signal.Clone() }, cancellationToken);
    }

    private async Task RemoveAsync(CallClient client)
    {
        CallClient? peer;
        lock (gate)
        {
            waitingClients.Remove(client);
            peer = client.Peer;
            client.Peer = null;
            if (peer is not null) peer.Peer = null;
        }

        if (peer is not null)
        {
            try { await peer.SendAsync(new { type = "peer-left" }, CancellationToken.None); }
            catch (WebSocketException) { }
            catch (ObjectDisposedException) { }
        }
    }

    private static async Task<JsonDocument?> ReceiveMessageAsync(WebSocket socket, CancellationToken cancellationToken)
    {
        var buffer = new byte[4096];
        using var message = new MemoryStream();

        while (true)
        {
            var result = await socket.ReceiveAsync(buffer, cancellationToken);
            if (result.MessageType == WebSocketMessageType.Close) return null;
            if (result.MessageType != WebSocketMessageType.Text) continue;

            message.Write(buffer, 0, result.Count);
            if (message.Length > 128 * 1024) return null;
            if (result.EndOfMessage) break;
        }

        return JsonDocument.Parse(message.ToArray());
    }

    private sealed class CallClient(WebSocket socket)
    {
        private readonly SemaphoreSlim sendLock = new(1, 1);
        public WebSocket Socket { get; } = socket;
        public CallClient? Peer { get; set; }

        public async Task SendAsync<T>(T payload, CancellationToken cancellationToken)
        {
            if (Socket.State != WebSocketState.Open) return;
            var data = JsonSerializer.SerializeToUtf8Bytes(payload);
            await sendLock.WaitAsync(cancellationToken);
            try
            {
                if (Socket.State == WebSocketState.Open)
                {
                    await Socket.SendAsync(data, WebSocketMessageType.Text, true, cancellationToken);
                }
            }
            finally
            {
                sendLock.Release();
            }
        }
    }
}
