export default function Popup() {
  return (
    <div className="p-4 w-64 bg-background text-foreground">
      <p className="text-sm text-muted-foreground">
        Click the extension icon or press <kbd className="font-mono bg-muted px-1 rounded">Ctrl+Q</kbd> to open the side panel.
      </p>
    </div>
  )
}
