const PurchaseCancelPage = () => {
  return (
    <div className="max-w-xl mx-auto p-6">
      <p className="mb-4">Você cancelou o processo de compra. Nenhuma cobrança foi realizada.</p>
      <a className="bg-blue-600 text-white px-4 py-2 rounded-md" href="/comprar">Tentar novamente</a>
    </div>
  );
};

export default PurchaseCancelPage;