import { NextResponse } from "next/server";

export async function GET() {
  // TODO: luego conectamos a Prisma. Hoy devolvemos mock.
  const data = [
    { id: "tnt_demo_1", name: "Pizzería Roma" },
    { id: "tnt_demo_2", name: "Sushi Kyoto" },
  ];
  return NextResponse.json({ data, page: 1, pageSize: 20, total: data.length });
}
