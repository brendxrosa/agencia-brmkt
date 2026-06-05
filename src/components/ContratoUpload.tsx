import ContratoUpload from '@/components/ContratoUpload'
// dentro do modal de edição do cliente:
<ContratoUpload clienteId={cliente.id} onExtraido={(dados) => setForm(f => ({ ...f, ...dados }))} />
