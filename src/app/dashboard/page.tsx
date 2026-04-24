export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Bom dia, Brenda 👋</h1>
        <p className="text-gray-500 text-sm mt-1">Plataforma Agência BR MKT</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {['Clientes', 'Kanban', 'Tarefas', 'Financeiro'].map(item => (
          <div key={item} className="card">
            <p className="text-lg font-display font-bold text-vinho">—</p>
            <p className="text-xs text-gray-500 mt-0.5">{item}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <p className="text-gray-500 text-sm">🚀 Plataforma no ar! Módulos sendo adicionados em breve.</p>
      </div>
    </div>
  )
}
