# mktg — terminal demo for README

Output demo.gif
Output demo.webm

Set Shell "zsh"
Set FontFamily "JetBrains Mono"
Set FontSize 15
Set Width 960
Set Height 540
Set Theme { "name": "mktg", "black": "#0f172a", "red": "#ef4444", "green": "#10b981", "yellow": "#eab308", "blue": "#3b82f6", "magenta": "#a78bfa", "cyan": "#22d3ee", "white": "#e2e8f0", "brightBlack": "#475569", "brightRed": "#f87171", "brightGreen": "#34d399", "brightYellow": "#fbbf24", "brightBlue": "#60a5fa", "brightMagenta": "#c4b5fd", "brightCyan": "#67e8f9", "brightWhite": "#f8fafc", "background": "#0f172a", "foreground": "#e2e8f0", "selectionBackground": "#334155", "cursorColor": "#10b981" }
Set Padding 24
Set TypingSpeed 40ms
Set CursorBlink false

Hide
Type "bash /Users/moizibnyousaf/projects/mktg/demo-setup.sh"
Enter
Sleep 500ms
Type "cd $(cat /tmp/mktg-demo-path) && clear"
Enter
Sleep 500ms
Show

Sleep 400ms
Type "mktg init --yes"
Sleep 250ms
Enter
Sleep 4s

Sleep 600ms
Type "mktg doctor"
Sleep 250ms
Enter
Sleep 4s

Sleep 600ms
Type "mktg status"
Sleep 250ms
Enter
Sleep 4s

Sleep 2s
