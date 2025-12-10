// app/api/ai/generate-description/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");


export async function POST(request: NextRequest) {
    try {
        const { nombre, imageUrl } = await request.json();

        if (!nombre || typeof nombre !== "string") {
            return NextResponse.json(
                { error: "El nombre del platillo es requerido" },
                { status: 400 }
            );
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        //const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        //const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });


        let prompt = `Eres un experto en gastronomía mexicana y descripción de platillos para apps de delivery como Rappi o Uber Eats.

Genera una descripción apetitosa y atractiva para el siguiente platillo: "${nombre}"

La descripción debe:
- Ser breve (máximo 2-3 líneas, aproximadamente 80-120 caracteres)
- Mencionar ingredientes principales
- Ser apetitosa y despertar el interés del cliente
- Usar un tono casual y amigable
- NO incluir precio
- NO incluir emojis

Responde SOLO con la descripción, sin comillas ni texto adicional.`;

        let result;

        if (imageUrl && imageUrl.trim() !== "") {
            // Si hay imagen, intentamos analizarla
            try {
                const imageResponse = await fetch(imageUrl);

                if (!imageResponse.ok) {
                    throw new Error("No se pudo cargar la imagen");
                }

                const imageBuffer = await imageResponse.arrayBuffer();
                const base64Image = Buffer.from(imageBuffer).toString("base64");
                const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

                prompt = `Eres un experto en gastronomía y descripción de platillos para apps de delivery.

Analiza esta imagen del platillo "${nombre}" y genera una descripción apetitosa y atractiva.

La descripción debe:
- Ser breve (máximo 2-3 líneas, aproximadamente 80-120 caracteres)
- Mencionar los ingredientes que puedas ver en la imagen
- Ser apetitosa y despertar el interés del cliente
- Usar un tono casual y amigable
- NO incluir precio
- NO incluir emojis

Responde SOLO con la descripción, sin comillas ni texto adicional.`;

                result = await model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType,
                        },
                    },
                ]);
            } catch (imgError) {
                console.error("Error al procesar imagen, generando sin imagen:", imgError);
                // Si falla la imagen, generamos sin ella
                result = await model.generateContent(prompt);
            }
        } else {
            // Sin imagen
            result = await model.generateContent(prompt);
        }

        const response = await result.response;
        const description = response.text().trim();

        // Limitar a 500 caracteres (tu límite del schema)
        const finalDescription = description.substring(0, 500);

        return NextResponse.json({
            description: finalDescription,
            usedImage: !!imageUrl,
        });
    } catch (error: unknown) {
        console.error("Error generando descripción:", error);

        const errorMessage = error instanceof Error ? error.message : "Error desconocido";

        return NextResponse.json(
            { error: `No se pudo generar la descripción: ${errorMessage}` },
            { status: 500 }
        );
    }
}