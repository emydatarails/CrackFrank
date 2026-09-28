#!/usr/bin/env python3
"""Re-encode the Windows XP sound pack (tools/xpsounds/*.wav) into src/sounds.js (FR.data.sounds, base64 MP3).
Needs ffmpeg on PATH. Edit MAP to change which sample plays for which game event, then run: python3 tools/make_sounds.py && python3 build.py"""
import base64, os, re, subprocess, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'xpsounds')
MAP = {
    'startup': 'Windows XP Startup.wav', 'logon': 'Windows XP Logon Sound.wav', 'logoff': 'Windows XP Logoff Sound.wav',
    'shutdown': 'Windows XP Shutdown.wav', 'error': 'Windows XP Critical Stop.wav', 'exclamation': 'Windows XP Exclamation.wav',
    'ding': 'Windows XP Ding.wav', 'default': 'Windows XP Default.wav', 'notify': 'Windows XP Balloon.wav', 'mail': 'Windows XP Notify.wav',
    'click': 'Windows XP Menu Command.wav', 'start': 'Windows XP Start.wav', 'nav': 'Windows Navigation Start.wav', 'recycle': 'Windows XP Recycle.wav',
    'minimize': 'Windows XP Minimize.wav', 'maximize': 'Windows XP Restore.wav', 'restore': 'Windows XP Restore.wav', 'tada': 'tada.wav',
    'unlock': 'Windows XP Hardware Insert.wav', 'popup': 'Windows XP Pop-up Blocked.wav',
}
lines = []
with tempfile.TemporaryDirectory() as tmp:
    for k, f in MAP.items():
        out = os.path.join(tmp, k + '.mp3')
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', os.path.join(SRC, f), '-ac', '2', '-ar', '44100', '-b:a', '128k', out], check=True)
        lines.append(f"    {k}: 'data:audio/mpeg;base64,{base64.b64encode(open(out, 'rb').read()).decode()}',")
p = os.path.join(ROOT, 'src', 'sounds.js')
s = open(p, encoding='utf-8').read()
s = re.sub(r"FR\.data\.sounds = \{.*?\n  \};", lambda m: "FR.data.sounds = {\n" + "\n".join(lines) + "\n  };", s, flags=re.S)
open(p, 'w', encoding='utf-8').write(s)
print('wrote', len(MAP), 'sounds to src/sounds.js')
