import * as React from 'react'

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: string }

interface ToastState {
  toasts: Toast[]
}

function reducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD':
      return { toasts: [...state.toasts, action.toast].slice(-5) }
    case 'REMOVE':
      return { toasts: state.toasts.filter((t) => t.id !== action.id) }
  }
}

let dispatch: React.Dispatch<ToastAction> | null = null
let globalState: ToastState = { toasts: [] }

export function useToastStore() {
  const [s, d] = React.useReducer(reducer, globalState)
  React.useEffect(() => {
    dispatch = d
    globalState = s
  })
  return s
}

export function toast(t: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).slice(2)
  dispatch?.({ type: 'ADD', toast: { ...t, id } })
  setTimeout(() => dispatch?.({ type: 'REMOVE', id }), 4000)
}
