"""
Lanzador Integral de Conecta2 + Tunel Seguro Cloudflare
Inicia el servidor Flask localmente y expone la URL segura con HTTPS automaticamente.
"""
import os
import sys

# Forzar codificacion segura y salida inmediata (sin buffering)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)

import time
import subprocess
import re
import webbrowser

def find_cloudflared():
    paths = [
        r"C:\Program Files (x86)\cloudflared\cloudflared.exe",
        r"C:\Program Files\cloudflared\cloudflared.exe",
        "cloudflared"
    ]
    for p in paths:
        if os.path.isabs(p) and os.path.exists(p):
            return p
    return "cloudflared"

def copy_to_clipboard(text):
    try:
        p = subprocess.Popen(['clip.exe'], stdin=subprocess.PIPE, text=True)
        p.communicate(text)
    except Exception:
        pass

def free_port_5000():
    if os.name == 'nt':
        try:
            out = subprocess.check_output('netstat -ano | findstr :5000', shell=True, text=True, errors='ignore')
            for line in out.strip().split('\n'):
                parts = line.strip().split()
                if len(parts) >= 5 and 'LISTENING' in parts:
                    pid = parts[-1]
                    if pid and pid != '0':
                        subprocess.run(f'taskkill /F /PID {pid}', shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass
        try:
            subprocess.run('taskkill /F /IM cloudflared.exe', shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass

def main():
    free_port_5000()
    print("======================================================================", flush=True)
    print("           INICIANDO CONECTA2 + TUNEL HTTPS SEGURO           ", flush=True)
    print("======================================================================", flush=True)
    print("\n[1/2] Arrancando servidor Flask en segundo plano...", flush=True)

    python_exe = sys.executable
    app_py = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app.py')

    # Arrancar servidor Flask
    server_proc = subprocess.Popen(
        [python_exe, app_py],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        cwd=os.path.dirname(os.path.abspath(__file__))
    )

    time.sleep(2)
    if server_proc.poll() is not None:
        print("[ERROR] El servidor Flask no ha podido arrancar. Verifica app.py.", flush=True)
        input("Presiona Enter para salir...")
        sys.exit(1)

    print("[OK] Servidor Flask corriendo en http://localhost:5000", flush=True)
    print("\n[2/2] Conectando con los servidores seguros de Cloudflare...", flush=True)

    cloudflared = find_cloudflared()
    cmd = [
        cloudflared,
        'tunnel',
        '--protocol', 'http2',
        '--edge-ip-version', '4',
        '--url', 'http://localhost:5000'
    ]

    try:
        tunnel_proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            encoding='utf-8',
            errors='replace'
        )
    except Exception as e:
        print(f"[ERROR] No se pudo ejecutar cloudflared: {e}", flush=True)
        server_proc.terminate()
        input("Presiona Enter para salir...")
        sys.exit(1)

    tunnel_url = None
    start_time = time.time()
    
    # Leer logs de cloudflared en tiempo real hasta dar con la URL
    while time.time() - start_time < 45:
        line = tunnel_proc.stdout.readline()
        if not line and tunnel_proc.poll() is not None:
            break
        match = re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', line)
        if match:
            tunnel_url = match.group(0)
            break

    if not tunnel_url:
        print("[ERROR] No se pudo obtener la URL de Cloudflare en 30 segundos.", flush=True)
        print("Revisa tu conexion a internet o el cortafuegos.", flush=True)
        tunnel_proc.terminate()
        server_proc.terminate()
        input("Presiona Enter para salir...")
        sys.exit(1)

    # Copiar al portapapeles
    copy_to_clipboard(tunnel_url)

    # Mostrar pantalla principal limpia
    print("\n" + "=" * 70, flush=True)
    print("              ***  CONECTA2 ESTA EN LINEA Y ES SEGURO  ***             ", flush=True)
    print("======================================================================", flush=True)
    print("\n  ENLACE DE ACCESO HTTPS (Camara y Microfono HABILITADOS):\n", flush=True)
    print(f"      >>  {tunnel_url}  <<\n", flush=True)
    print("  [!] El enlace ya ha sido copiado automaticamente a tu portapapeles.", flush=True)
    print("      (Solo pulsa Ctrl + V para enviarselo a tu companero)", flush=True)
    print("\n" + "----------------------------------------------------------------------", flush=True)
    print("  QUE DEBEIS HACER:", flush=True)
    print("  1. Abre ese enlace en tu navegador.", flush=True)
    print("  2. Enviaselo a tu companero para que lo abra en su ordenador.", flush=True)
    print("  3. Cuando el navegador pregunte, pulsad en 'PERMITIR' para", flush=True)
    print("     dar acceso a la camara y al microfono.", flush=True)
    print("======================================================================", flush=True)
    print("\n  Para apagar el servidor y el tunel, presiona Ctrl + C en esta ventana.\n", flush=True)

    # Abrir navegador automaticamente
    try:
        webbrowser.open(tunnel_url)
    except Exception:
        pass

    # Mantener en ejecución hasta que el usuario pulse Ctrl+C
    try:
        while True:
            time.sleep(1)
            if server_proc.poll() is not None:
                print("\n[AVISO] El servidor Flask se ha detenido.", flush=True)
                break
            if tunnel_proc.poll() is not None:
                print("\n[AVISO] El tunel se ha detenido.", flush=True)
                break
    except KeyboardInterrupt:
        print("\nDeteniendo servidor y tunel...", flush=True)
    finally:
        try:
            tunnel_proc.terminate()
        except Exception:
            pass
        try:
            server_proc.terminate()
        except Exception:
            pass
        print("Conecta2 detenido correctamente.", flush=True)

if __name__ == '__main__':
    main()
