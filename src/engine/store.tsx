import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { seedCampaigns } from '../data/catalog'
import { advance, createCustomCampaign, decide, submitCustomHypothesis } from './simulate'
import type { Campaign, Domain } from '../types'

type State = {
  campaigns: Campaign[]
  selectedId: string
  clock: number
  speedMs: number
}

type Action =
  | { type: 'tick' }
  | { type: 'select'; id: string }
  | { type: 'toggle-run' }
  | { type: 'toggle-auto' }
  | { type: 'approve' }
  | { type: 'reject' }
  | { type: 'speed'; ms: number }
  | { type: 'select-hypothesis'; hypothesisId: string }
  | {
      type: 'submit-hypothesis'
      title: string
      statement: string
      mechanism: string
      falsifier: string
      author: string
    }
  | {
      type: 'create-campaign'
      name: string
      domain: Domain
      question: string
      owner: string
    }

function formatClock(n: number) {
  const h = String(Math.floor(n / 60) % 24).padStart(2, '0')
  const m = String(n % 60).padStart(2, '0')
  return `SIM ${h}:${m}`
}

function reducer(state: State, action: Action): State {
  const now = formatClock(state.clock)
  switch (action.type) {
    case 'tick': {
      return {
        ...state,
        clock: state.clock + 7,
        campaigns: state.campaigns.map((c) =>
          c.id === state.selectedId && c.running ? advance(c, formatClock(state.clock + 7)) : c,
        ),
      }
    }
    case 'select':
      return { ...state, selectedId: action.id }
    case 'toggle-run':
      return {
        ...state,
        campaigns: state.campaigns.map((c) =>
          c.id === state.selectedId
            ? { ...c, running: c.waitingApproval ? false : !c.running }
            : c,
        ),
      }
    case 'toggle-auto':
      return {
        ...state,
        campaigns: state.campaigns.map((c) =>
          c.id === state.selectedId ? { ...c, autoApproveLow: !c.autoApproveLow } : c,
        ),
      }
    case 'approve':
      return {
        ...state,
        campaigns: state.campaigns.map((c) =>
          c.id === state.selectedId ? decide(c, 'approve', now) : c,
        ),
      }
    case 'reject':
      return {
        ...state,
        campaigns: state.campaigns.map((c) =>
          c.id === state.selectedId ? decide(c, 'reject', now) : c,
        ),
      }
    case 'speed':
      return { ...state, speedMs: action.ms }
    case 'select-hypothesis':
      return {
        ...state,
        campaigns: state.campaigns.map((c) =>
          c.id === state.selectedId ? { ...c, selectedHypothesisId: action.hypothesisId } : c,
        ),
      }
    case 'submit-hypothesis':
      return {
        ...state,
        campaigns: state.campaigns.map((c) =>
          c.id === state.selectedId
            ? submitCustomHypothesis(
                c,
                action.title,
                action.statement,
                action.mechanism,
                action.falsifier,
                action.author,
                now,
              )
            : c,
        ),
      }
    case 'create-campaign': {
      const newCamp = createCustomCampaign(
        action.name,
        action.domain,
        action.question,
        action.owner,
        now,
      )
      return {
        ...state,
        campaigns: [newCamp, ...state.campaigns],
        selectedId: newCamp.id,
      }
    }
    default:
      return state
  }
}

const Ctx = createContext<{
  state: State
  selected: Campaign
  dispatch: (a: Action) => void
} | null>(null)

export function DiscoveryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    campaigns: seedCampaigns(),
    selectedId: 'cmp-electrolyte',
    clock: 14 * 60 + 22,
    speedMs: 1400,
  })

  useEffect(() => {
    const t = setInterval(() => dispatch({ type: 'tick' }), state.speedMs)
    return () => clearInterval(t)
  }, [state.speedMs])

  const selected = useMemo(
    () => state.campaigns.find((c) => c.id === state.selectedId) ?? state.campaigns[0],
    [state.campaigns, state.selectedId],
  )

  return <Ctx.Provider value={{ state, selected, dispatch }}>{children}</Ctx.Provider>
}

export function useDiscovery() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDiscovery outside provider')
  return ctx
}

export function useClockLabel() {
  const { state } = useDiscovery()
  return formatClock(state.clock)
}

export function useSelect() {
  const { dispatch } = useDiscovery()
  return useCallback((id: string) => dispatch({ type: 'select', id }), [dispatch])
}
