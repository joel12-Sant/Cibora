type Props = { params: { id: string } };

async function getMenu(tenantId: string) {
  return [
    { id: "item_1", name: "Margarita", price: 120 },
    { id: "item_2", name: "Pepperoni", price: 140 },
  ];
}

export default async function RestaurantDetailPage({ params }: Props) {
  const menu = await getMenu(params.id);
  return (
    <main className="space-y-6">
      <h2 className="text-xl font-semibold">Menú</h2>
      <ul className="space-y-3">
        {menu.map(item => (
          <li key={item.id} className="flex items-center justify-between rounded-xl border p-4">
            <div>
              <div className="font-medium">{item.name}</div>
              <div className="text-sm opacity-80">$ {item.price}</div>
            </div>
            <button className="rounded-lg border px-4 py-2 hover:bg-white/5">
              Agregar
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
