import { useState, useEffect } from 'react'
import { ipc } from '@/lib/ipc'

interface Props {
  open: boolean
  onClose: () => void
}

export default function SettingsDialog({ open, onClose }: Props) {
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open) {
      ipc.getApiKey().then(setApiKey).catch(() => {})
      setSaved(false)
    }
  }, [open])

  async function handleSave() {
    setSaving(true)
    await ipc.setApiKey(apiKey.trim()).catch(() => {})
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-white border border-zinc-200 rounded-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-medium text-zinc-900 mb-4">Settings</h2>

        <label className="block text-xs text-zinc-600 mb-1.5">
          Anthropic API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-..."
          className="w-full bg-white border border-zinc-300 rounded px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <p className="text-xs text-zinc-500 mt-1.5">
          Your key is stored locally in the app data folder.
        </p>

        <div className="flex items-center justify-end gap-3 mt-5">
          <button
            onClick={onClose}
            className="text-xs text-zinc-600 hover:text-zinc-900 transition-colors px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded px-4 py-1.5 transition-colors"
          >
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
