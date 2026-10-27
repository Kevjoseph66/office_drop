/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';

interface SubItemTemplate {
  nombre: string;
  cantidadEspecifica: string;
  categoria?: string;
  costoEstimado?: string;
}

interface ItemTemplate {
  nombre: string;
  cantidadEspecifica: string;
  categoria: string;
  costoEstimado: string;
  subItems?: SubItemTemplate[];
}

// Fallback generator in case of missing API key or transient network issues
function generateSmartFallbackItems(
  title: string,
  count: number,
  themeDescription: string,
  _budgetEstimate: string
) {
  const normalizedCount = Math.max(2, Math.min(count || 10, 50));
  const t = (title + ' ' + themeDescription).toLowerCase();

  const isCriollo =
    t.includes('crioll') ||
    t.includes('arepa') ||
    t.includes('empanad') ||
    t.includes('venezol') ||
    t.includes('colomb') ||
    t.includes('latino') ||
    t.includes('maracuy') ||
    t.includes('hallac') ||
    t.includes('pabell');
  const isBreakfast =
    t.includes('desayun') || t.includes('mañana') || t.includes('cafe') || t.includes('café');
  const isMexican =
    t.includes('taco') || t.includes('mexic') || t.includes('burrito') || t.includes('guacamole');

  let pool: ItemTemplate[] = [];

  if (isCriollo) {
    // Authentic Venezuelan / Colombian / Latin Criollo food
    pool = [
      {
        nombre: 'Arepas de Maíz Calientes & Mantequilla',
        cantidadEspecifica: 'Paquete de 10 arepas precocidas o recién hechas + 1 pote mantequilla/nata',
        categoria: 'Básicos',
        costoEstimado: '$6 - $8',
        subItems: [
          { nombre: 'Arepas de maíz blanco recién asadas', cantidadEspecifica: '10 unidades', categoria: 'Básicos' },
          { nombre: 'Mantequilla o Nata criolla', cantidadEspecifica: '1 pote 250g', categoria: 'Complementos' },
        ],
      },
      {
        nombre: 'Queso Blanco Llanero / Costeño Rallado',
        cantidadEspecifica: '1 bolsa de 500g de queso blanco fresco rallado',
        categoria: 'Rellenos',
        costoEstimado: '$6 - $8',
      },
      {
        nombre: 'Carne Mechada Guisada Criolla',
        cantidadEspecifica: '1 recipiente térmico con 600g de carne jugosa desmechada',
        categoria: 'Plato Fuerte',
        costoEstimado: '$9 - $12',
      },
      {
        nombre: 'Huevos Pericos Criollos (Tomate y Cebolla)',
        cantidadEspecifica: 'Bandeja térmica con 10-12 huevos revueltos con sofrito criollo',
        categoria: 'Caliente',
        costoEstimado: '$6 - $8',
      },
      {
        nombre: 'Caraotas / Frijoles Negros Refritos con Queso',
        cantidadEspecifica: '1 pote de 800g listo para untar con queso blanco por encima',
        categoria: 'Acompañamiento',
        costoEstimado: '$5 - $7',
      },
      {
        nombre: 'Termo de Café con Leche & Guayoyo',
        cantidadEspecifica: '1 termo de 2L recién colado + sobres de azúcar/edulcorante',
        categoria: 'Bebidas',
        costoEstimado: '$6 - $8',
      },
      {
        nombre: 'Jugo Natural de Papelón con Limón o Maracuyá',
        cantidadEspecifica: '2 botellas de 1.5L bien heladas',
        categoria: 'Bebidas',
        costoEstimado: '$5 - $7',
      },
      {
        nombre: 'Docena de Tequeños con Salsa Tártara',
        cantidadEspecifica: 'Bandeja de 12 tequeños de queso fritos y crujientes',
        categoria: 'Salado',
        costoEstimado: '$8 - $10',
        subItems: [
          { nombre: 'Tequeños de queso fritos', cantidadEspecifica: '12 unidades doradas', categoria: 'Salado' },
          { nombre: 'Salsa tártara o guasacaca', cantidadEspecifica: '1 envase mediano dip', categoria: 'Salsas' },
        ],
      },
      {
        nombre: 'Tajadas de Plátano Maduro con Queso',
        cantidadEspecifica: 'Bandeja con 15-20 tajadas doradas y queso rallado',
        categoria: 'Acompañamiento',
        costoEstimado: '$5 - $7',
      },
      {
        nombre: 'Fruta Tropical Fresca (Papaya, Melón y Piña)',
        cantidadEspecifica: 'Bowl grande de 1.5 kg surtido con frutas picadas',
        categoria: 'Frutas',
        costoEstimado: '$5 - $7',
      },
      {
        nombre: 'Platos Hondos, Servilletas y Vasos Criollos',
        cantidadEspecifica: 'Paquete de 30 platos resistentes + 60 servilletas + 30 vasos',
        categoria: 'Desechables',
        costoEstimado: '$5 - $6',
      },
      {
        nombre: 'Dulce de Lechoza o Golfeados con Queso',
        cantidadEspecifica: 'Bandeja con 6 golfeados medianos o frasco de dulce casero',
        categoria: 'Postre',
        costoEstimado: '$7 - $9',
      },
    ];
  } else if (isBreakfast) {
    pool = [
      {
        nombre: 'Café de grano premium & Leche',
        cantidadEspecifica: '1 bolsa de café 500g + 2L leche (entera y vegetal)',
        categoria: 'Bebidas',
        costoEstimado: '$7 - $9',
      },
      {
        nombre: 'Jugo de Naranja 100% Natural',
        cantidadEspecifica: '2 botellas de 1.5L bien frías',
        categoria: 'Bebidas',
        costoEstimado: '$5 - $7',
      },
      {
        nombre: 'Docena de Medialunas / Croissants',
        cantidadEspecifica: '12 medialunas recién horneadas',
        categoria: 'Panadería',
        costoEstimado: '$6 - $8',
      },
      {
        nombre: 'Sandwiches de Miga / Jamón y Queso',
        cantidadEspecifica: '1 bandeja de 12 unidades',
        categoria: 'Salado',
        costoEstimado: '$8 - $10',
      },
      {
        nombre: 'Fruta Fresca Picada Variada',
        cantidadEspecifica: 'Bowl con melón, frutillas y uvas (1.5 kg)',
        categoria: 'Frutas',
        costoEstimado: '$6 - $8',
      },
      {
        nombre: 'Yogurt Griego & Granola',
        cantidadEspecifica: '1 pote grande 1kg + bolsa de granola 300g',
        categoria: 'Saludable',
        costoEstimado: '$7 - $9',
      },
      {
        nombre: 'Huevos Revueltos con Tocino',
        cantidadEspecifica: 'Bandeja térmica para 6-8 porciones',
        categoria: 'Caliente',
        costoEstimado: '$8 - $10',
      },
      {
        nombre: 'Muffins y Cupcakes Variados',
        cantidadEspecifica: 'Caja surtida de 10 unidades',
        categoria: 'Dulce',
        costoEstimado: '$7 - $9',
      },
      {
        nombre: 'Queso Crema, Palta/Aguacate y Mermelada',
        cantidadEspecifica: '2 potes queso crema + 3 paltas listas',
        categoria: 'Complementos',
        costoEstimado: '$6 - $8',
      },
      {
        nombre: 'Vasos térmicos, Servilletas y Cubiertos',
        cantidadEspecifica: 'Paquete de 30 vasos + 50 servilletas + platos',
        categoria: 'Desechables',
        costoEstimado: '$4 - $6',
      },
      {
        nombre: 'Empanaditas de Queso y Jamón',
        cantidadEspecifica: '12 unidades horneadas listas para comer',
        categoria: 'Salado',
        costoEstimado: '$8 - $10',
      },
      {
        nombre: 'Té variado e Infusiones + Edulcorante',
        cantidadEspecifica: 'Caja surtida 30 saquitos + sobres azúcar/stevia',
        categoria: 'Bebidas',
        costoEstimado: '$4 - $6',
      },
      {
        nombre: 'Bagels surtidos',
        cantidadEspecifica: 'Bolsa de 8 bagels frescos',
        categoria: 'Panadería',
        costoEstimado: '$6 - $8',
      },
      {
        nombre: 'Galletas Artesanales de Avena y Chispas',
        cantidadEspecifica: '2 paquetes grandes (aprox 20 galletas)',
        categoria: 'Dulce',
        costoEstimado: '$5 - $7',
      },
    ];
  } else if (isMexican) {
    pool = [
      {
        nombre: 'Totopos / Tortilla Chips Artesanales',
        cantidadEspecifica: '3 bolsas grandes de 400g crujientes',
        categoria: 'Snacks',
        costoEstimado: '$5 - $7',
      },
      {
        nombre: 'Guacamole Fresco con Pico de Gallo',
        cantidadEspecifica: '2 bowls medianos (aprox 800g total)',
        categoria: 'Salsas',
        costoEstimado: '$7 - $9',
      },
      {
        nombre: 'Carne para Tacos o Tinga de Pollo',
        cantidadEspecifica: 'Recipiente térmico 1.2 kg preparado',
        categoria: 'Plato Fuerte',
        costoEstimado: '$10 - $13',
      },
      {
        nombre: 'Tortillas de Maíz y Harina',
        cantidadEspecifica: '3 paquetes de 12 tortillas c/u',
        categoria: 'Básicos',
        costoEstimado: '$4 - $6',
      },
      {
        nombre: 'Queso Rallado Surtido (Cheddar y Oaxaca)',
        cantidadEspecifica: '2 bolsas de 400g cada una',
        categoria: 'Complementos',
        costoEstimado: '$6 - $8',
      },
      {
        nombre: 'Salsas Mexicana (Verde taquera y Roja)',
        cantidadEspecifica: '2 frascos medianos (suave y picante)',
        categoria: 'Salsas',
        costoEstimado: '$5 - $7',
      },
      {
        nombre: 'Gaseosas y Aguas Saborizadas',
        cantidadEspecifica: '2 botellas de 2.5L bien frías',
        categoria: 'Bebidas',
        costoEstimado: '$5 - $7',
      },
      {
        nombre: 'Agua de Jamaica o Tamarindo',
        cantidadEspecifica: '3 Litros en jarra o botellas',
        categoria: 'Bebidas',
        costoEstimado: '$5 - $7',
      },
      {
        nombre: 'Crema ácida y Jalapeños encurtidos',
        cantidadEspecifica: '2 potes de crema + 1 lata grande jalapeños',
        categoria: 'Complementos',
        costoEstimado: '$5 - $7',
      },
      {
        nombre: 'Churros con Canela y Azúcar',
        cantidadEspecifica: 'Docena de churros con dip de manjar/cajeta',
        categoria: 'Postre',
        costoEstimado: '$7 - $9',
      },
      {
        nombre: 'Frijoles Refritos con Queso Cotija',
        cantidadEspecifica: '1 recipiente grande 800g listo para untar',
        categoria: 'Acompañamiento',
        costoEstimado: '$5 - $7',
      },
      {
        nombre: 'Platos Hondos, Servilletas y Tenedores',
        cantidadEspecifica: 'Paquete de 30 platos resistentes + 60 servilletas',
        categoria: 'Desechables',
        costoEstimado: '$5 - $6',
      },
    ];
  } else {
    // General food sharing / lunch / pizza / snacks
    pool = [
      {
        nombre: 'Empanadas Gourmet Horneadas',
        cantidadEspecifica: 'Bandeja de 10 unidades surtidas (carne/queso)',
        categoria: 'Salado',
        costoEstimado: '$8 - $11',
      },
      {
        nombre: 'Pizzas Medianas Familiares Variadas',
        cantidadEspecifica: '1 pizza grande cortada en porciones',
        categoria: 'Plato Fuerte',
        costoEstimado: '$9 - $12',
      },
      {
        nombre: 'Tabla de Quesos y Fiambres',
        cantidadEspecifica: 'Bandeja con gouda, jamón serrano y salame (400g)',
        categoria: 'Entrada',
        costoEstimado: '$9 - $12',
      },
      {
        nombre: 'Bebidas Gaseosas y Aguas Minerales',
        cantidadEspecifica: '2 botellas de 2.25L frías (Zero y Normal)',
        categoria: 'Bebidas',
        costoEstimado: '$5 - $7',
      },
      {
        nombre: 'Jugos de Fruta Natural y Limonada',
        cantidadEspecifica: '2 botellas de 1.5L bien heladas',
        categoria: 'Bebidas',
        costoEstimado: '$5 - $7',
      },
      {
        nombre: 'Snacks Salados (Papas fritas y Maní)',
        cantidadEspecifica: '2 bolsas grandes de papas + 1 mix frutos secos',
        categoria: 'Snacks',
        costoEstimado: '$6 - $8',
      },
      {
        nombre: 'Dip de Queso & Espinaca o Cebolla Caramelizada',
        cantidadEspecifica: '2 potes con crackers y tostaditas',
        categoria: 'Snacks',
        costoEstimado: '$6 - $8',
      },
      {
        nombre: 'Tarta Dulce o Brownies de Chocolate',
        cantidadEspecifica: 'Caja con 12 porciones generosas',
        categoria: 'Postre',
        costoEstimado: '$7 - $10',
      },
      {
        nombre: 'Ensalada César Fresca',
        cantidadEspecifica: 'Bowl grande con lechuga, pollo grillé y aderezo',
        categoria: 'Saludable',
        costoEstimado: '$8 - $10',
      },
      {
        nombre: 'Sandwiches Mini Surtidos de Miga',
        cantidadEspecifica: 'Bandeja de 12 sandwiches gourmet',
        categoria: 'Salado',
        costoEstimado: '$8 - $10',
      },
      {
        nombre: 'Frutas de Estación Listas para Comer',
        cantidadEspecifica: 'Uvas, mandarinas y manzanas lavadas (2 kg)',
        categoria: 'Frutas',
        costoEstimado: '$5 - $7',
      },
      {
        nombre: 'Hielos y Bebidas Frías',
        cantidadEspecifica: '2 bolsas de hielo 3kg + hielera o balde',
        categoria: 'Bebidas',
        costoEstimado: '$4 - $6',
      },
      {
        nombre: 'Set Completo de Platos, Servilletas y Vasos',
        cantidadEspecifica: '40 vasos descartables + 30 platos + servilletas',
        categoria: 'Desechables',
        costoEstimado: '$5 - $7',
      },
      {
        nombre: 'Alfajores o Galletitas Dulces Caseras',
        cantidadEspecifica: 'Caja de 12 alfajores artesanales',
        categoria: 'Postre',
        costoEstimado: '$6 - $9',
      },
    ];
  }

  const items = [];
  for (let i = 0; i < normalizedCount; i++) {
    const template = pool[i % pool.length];
    const multiplier = Math.floor(i / pool.length) + 1;
    const nameSuffix = multiplier > 1 ? ` (Lote ${multiplier})` : '';
    items.push({
      id: `item-${i + 1}-${Date.now().toString(36)}`,
      nombre: template.nombre + nameSuffix,
      cantidadEspecifica: template.cantidadEspecifica,
      categoria: template.categoria,
      subItems: template.subItems ? template.subItems.map((s) => ({ ...s })) : undefined,
    });
  }
  return items;
}

/**
 * Vercel Serverless Function Handler
 * Route: /api/generate-potluck-items
 */
export default async function handler(req: any, res: any) {
  // CORS & Methods headers
  res.setHeader?.('Access-Control-Allow-Origin', '*');
  res.setHeader?.('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader?.('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') {
      return res.status(200).end();
    }
    res.statusCode = 200;
    return res.end();
  }

  const sendJson = (statusCode: number, data: any) => {
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(statusCode).json(data);
    }
    res.statusCode = statusCode;
    res.setHeader?.('Content-Type', 'application/json');
    res.end?.(JSON.stringify(data));
  };

  try {
    const rawBody = req.body;
    const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody || {};

    const { title, participantsCount, themeDescription, customBudget } = body;
    const count = parseInt(participantsCount, 10) || 10;
    const safeTitle = (title || 'Compartir de Oficina').trim();
    const safeDesc = (themeDescription || 'Comida rica, variada y equilibrada en costos').trim();
    const safeBudget = (
      customBudget || 'Gasto similar y moderado para cada compañero (~$5 a $10 por persona)'
    ).trim();

    // Read API key from either standard or Vite prefix
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (apiKey) {
      try {
        const aiClient = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const prompt = `Actúa como organizador experto de eventos gastronómicos y dinámicas de oficina con conocimiento culinario profundo de gastronomías mundiales y regionales (latinoamericana, venezolana, colombiana, mexicana, española, asiática, criolla, etc.).

Necesito exactamente ${count} tickets/aportes individuales para un compartir de comida titulado: "${safeTitle}".
Detalles o temática: "${safeDesc}".
Presupuesto / Directriz de equidad: "${safeBudget}".

REGLAS CRÍTICAS DE CALIDAD CULINARIA:
1. AUTENTICIDAD CULTURAL Y REGIONAL:
   - Si el título o temática menciona "criollo" (ej: "desayuno criollo", "almuerzo criollo"), genera comida 100% auténtica criolla (arepas de maíz, queso blanco/llanero, carne mechada, huevos pericos, caraotas, café con leche, papelón con limón, tequeños, tajadas, etc.). ¡Nunca devuelvas un desayuno continental genérico si se especificó una temática o gastronomía particular!
   - Aplica este mismo principio para cualquier temática (tacos, asado, tapas, sushi, comida saludable, etc.).
2. SOPORTE DE MÚLTIPLES PRODUCTOS POR TICKET:
   - Si la dinámica contempla que cada persona traiga más de una cosa (o para eventos con pocas personas donde se necesitan muchas provisiones), en cada ítem incluye un campo "subItems" con la lista detallada de los productos individuales que componen ese aporte (ej: "Bebidas y Vasos" -> subItem 1: 2 botellas de jugo 1.5L; subItem 2: Paquete de 30 vasos).
3. EXACTITUD NUMÉRICA: Debes devolver EXACTAMENTE ${count} tickets en la lista (ni uno más, ni uno menos).
4. EQUIDAD EN COSTOS: El valor total de cada ticket debe ser similar y accesible según la directriz.
5. ESPECIFICIDAD DE SUPERMERCADO: "cantidadEspecifica" debe ser clara y precisa para compras en supermercado (ej: "2 botellas de 1.5L bien frías", "1 bandeja de 12 empanadas recién horneadas").
6. "costoEstimado" debe ser un rango realista en formato texto (ej: "$5 - $8", "$6 - $9").`;

        const response = await aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction:
              'Eres OfficeDrop AI. Generas listas de comida para dinámicas de oficina donde cada participante aporta algo justo, realista y delicioso, respetando con precisión la cultura gastronómica solicitada.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: 'Identificador único como item-1, item-2' },
                  nombre: {
                    type: Type.STRING,
                    description: 'Nombre descriptivo del alimento, aporte o combo',
                  },
                  cantidadEspecifica: {
                    type: Type.STRING,
                    description: 'Cantidad exacta a comprar (ej: 2 Litros de jugo bien frío)',
                  },
                  categoria: {
                    type: Type.STRING,
                    description: 'Categoría como Bebidas, Salado, Postre, Snacks, Desechables, Combo',
                  },
                  costoEstimado: {
                    type: Type.STRING,
                    description: 'Rango de costo estimado equilibrado (ej: $5 - $8)',
                  },
                  subItems: {
                    type: Type.ARRAY,
                    description:
                      'Lista detallada de productos individuales si este ticket incluye más de un producto',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        nombre: { type: Type.STRING, description: 'Nombre del producto' },
                        cantidadEspecifica: {
                          type: Type.STRING,
                          description: 'Cantidad específica a comprar',
                        },
                        categoria: { type: Type.STRING, description: 'Categoría' },
                        costoEstimado: { type: Type.STRING, description: 'Costo estimado' },
                      },
                      required: ['nombre', 'cantidadEspecifica'],
                    },
                  },
                },
                required: ['id', 'nombre', 'cantidadEspecifica', 'categoria', 'costoEstimado'],
              },
            },
          },
        });

        const rawText = response.text?.trim() || '';
        if (rawText) {
          const parsed = JSON.parse(rawText);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sanitized = parsed.map((it, idx) => ({
              id: it.id || `item-${idx + 1}-${Date.now().toString(36)}`,
              nombre: String(it.nombre || `Ítem ${idx + 1}`).trim(),
              cantidadEspecifica: String(it.cantidadEspecifica || '1 porción adecuada').trim(),
              categoria: String(it.categoria || 'Varios').trim(),
              costoEstimado: String(it.costoEstimado || '$5 - $8').trim(),
              subItems:
                Array.isArray(it.subItems) && it.subItems.length > 0
                  ? it.subItems
                      .map((s: any) => ({
                        nombre: String(s.nombre || '').trim(),
                        cantidadEspecifica: String(s.cantidadEspecifica || '').trim(),
                        categoria: s.categoria ? String(s.categoria).trim() : undefined,
                        costoEstimado: s.costoEstimado ? String(s.costoEstimado).trim() : undefined,
                      }))
                      .filter((s: any) => Boolean(s.nombre))
                  : undefined,
            }));
            return sendJson(200, {
              success: true,
              source: 'gemini-2.5-flash',
              items: sanitized,
            });
          }
        }
      } catch (geminiError: any) {
        console.warn(
          'Gemini serverless function warning, falling back to smart curated items:',
          geminiError?.message || geminiError
        );
      }
    }

    // Fallback to high-quality smart items
    const fallbackItems = generateSmartFallbackItems(safeTitle, count, safeDesc, safeBudget);
    return sendJson(200, {
      success: true,
      source: 'smart-template-engine',
      items: fallbackItems,
    });
  } catch (error: any) {
    console.error('Error generating potluck items in serverless function:', error);
    return sendJson(500, {
      success: false,
      error: error?.message || 'Error al procesar la lista con IA',
    });
  }
}
