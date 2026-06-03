async function salvar() {
  if (!form.titulo) return alert('Título é obrigatório!')
  setSalvando(true)
  const dados = {
    titulo: form.titulo,
    tipo: form.tipo,
    cliente_id: form.cliente_id || null,
    conteudo: form.conteudo || null,
    link_arquivo: form.link_arquivo || null,
    drive_url: form.drive_url || null,
  }
  if (editando?.id) {
    await supabase.from('docs').update({ ...dados, updated_at: new Date().toISOString() }).eq('id', editando.id)
  } else {
    await supabase.from('docs').insert(dados)
  }
  setSalvando(false)
  setModalAberto(false)
  setEditando(null)
  setForm({ cliente_id: '', titulo: '', tipo: 'nota', conteudo: '', link_arquivo: '', drive_url: '' })
  carregar()
}
