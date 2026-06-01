'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'

export default function PushNotificacoes() {
  const [suportado, setSuportado] = useState(false)
  const [ativado, setAtivado] = useState(false)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    setSuportado('serviceWorker' in navigator && 'PushManager' in window)
    checkPermissao()
  }, [])

  async function checkPermissao() {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      setAtivado(!!sub)
    }
  }

  async function ativarNotificacoes() {
    setCarregando(true)
    try {
      const permissao = await Notification.requestPermission()
      if (permissao !== 'granted') {
        alert('Permissão negada. Ative nas configurações do navegador.')
        return
      }

      // Registra service worker
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Subscreve ao push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_KEY!
        )
      })

      // Salva no servidor
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub })
      })

      setAtivado(true)
    } catch (err) {
      console.error('Erro ao ativar notificações:', err)
    } finally {
      setCarregando(false)
    }
  }

  async function desativarNotificacoes() {
    setCarregando(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      await sub?.unsubscribe()
      setAtivado(false)
    } finally {
      setCarregando(false)
    }
  }

  if (!suportado) return null

  return (
    <button
      onClick={ativado ? desativarNotificacoes : ativarNotificacoes}
      disabled={carregando}
      className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
        ativado
          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
          : 'bg-white border-gray-200 text-gray-500 hover:bg-creme'
      }`}
      title={ativado ? 'Notificações ativadas' : 'Ativar notificações'}
    >
      {ativado ? <Bell size={16} /> : <BellOff size={16} />}
    </button>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
