'use client'
import { useEffect, useState, useTransition, useCallback } from 'react'
import { fetchSlackAction, upsertSlackAction, type SlackSettingsRow } from './actions'
import { Banner, card, input, btn, label } from './settings-panel'

const TOGGLES: Array<[keyof SlackSettingsRow, string]> = [
  ['leaderboardEnabled', 'Leaderboard'],
  ['milestoneEnabled', 'Milestones (master)'],
  ['streakMilestoneEnabled', 'Streak milestones'],
  ['bigDealEnabled', 'Big-deal celebration'],
  ['lossDebriefEnabled', 'Loss debrief (DM)'],
  ['alertsEnabled', 'Anomaly alerts (DM)'],
  ['dailyTargetsEnabled', 'Daily targets (DM)'],
]

const DEFAULTS: SlackSettingsRow = {
  overallChannelId: null,
  leaderboardEnabled: true,
  milestoneEnabled: true,
  streakMilestoneEnabled: true,
  bigDealEnabled: true,
  lossDebriefEnabled: true,
  alertsEnabled: true,
  dailyTargetsEnabled: true,
}

export function SlackTab() {
  const [state, setState] = useState<SlackSettingsRow>(DEFAULTS)
  const [botConnected, setBotConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const load = useCallback(() => {
    setLoading(true)
    fetchSlackAction().then((res) => {
      setState({ ...DEFAULTS, ...(res.config ?? {}) })
      setBotConnected(res.botConnected)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function toggle(k: keyof SlackSettingsRow) {
    setState((s) => ({ ...s, [k]: !s[k] }))
  }

  function save() {
    setError(null)
    setOk(null)
    startTransition(async () => {
      const res = await upsertSlackAction(state)
      if (res.error) setError(res.error)
      else {
        setOk('Slack settings saved.')
        load()
      }
    })
  }

  return (
    <div className="space-y-4">
      <Banner error={error} ok={ok} />
      <div className={card}>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className={`text-[11px] ${botConnected ? 'text-[#4ade80]' : 'text-amber-400'}`}>
            {botConnected ? 'Bot connected ✓' : 'Not connected — set SLACK_BOT_TOKEN'}
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-gray-600 py-4">Loading…</p>
        ) : (
          <div className="space-y-5">
            <div>
              <h4 className={`${label} mb-2`}>Overall channel</h4>
              <p className="text-[11px] text-gray-600 mb-2">
                One shared channel for Leaderboard, Milestones, and Big-deal celebration.
              </p>
              <input
                className={`${input} w-64`}
                placeholder="C0…"
                value={state.overallChannelId ?? ''}
                onChange={(e) => setState((s) => ({ ...s, overallChannelId: e.target.value }))}
              />
            </div>

            <div>
              <h4 className={`${label} mb-2`}>Message types</h4>
              <div className="flex flex-wrap gap-2">
                {TOGGLES.map(([k, lbl]) => (
                  <button
                    key={k}
                    onClick={() => toggle(k)}
                    className={`text-[11px] px-2 py-1 rounded-lg border ${
                      state[k]
                        ? 'bg-[#0b2a17] text-[#4ade80] border-[#4ade80]/30'
                        : 'bg-white/[0.04] text-gray-600 border-white/[0.08]'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-600 mt-2">
                Loss debrief, Anomaly alerts, and Daily targets are personal DMs — no channel needed.
              </p>
            </div>

            <button className={btn} disabled={pending} onClick={save}>
              Save Slack settings
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
