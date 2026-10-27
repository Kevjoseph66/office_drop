import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Initialize GoogleGenAI server-side with telemetry header
const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Fallback generator in case of missing API key or transient quota issues
function generateSmartFallbackItems(
  title: string,
  count: number,
  themeDescription: string,
  budgetEstimate: string
) {
  const normalizedCount = Math.max(2, Math.min(count || 10, 50));
  const t = (title + ' ' + themeDescription).toLowerCase();

  const isBreakfast = t.includes('desayun') || t.includes('mañana') || t.includes('cafe') || t.includes('café');
  const isMexican = t.includes('taco') || t.includes('mexic') || t.includes('burrito') || t.includes('guacamole');
  const isAfternoon = t.includes('meriend') || t.includes('tarde') || t.includes('snack') || t.includes('pizza');

  interface ItemTemplate {
    nombre: string;
    cantidadEspecifica: string;
    categoria: string;
    costoEstimado: string;
  }

  let pool: ItemTemplate[] = [];

  if (isBreakfast) {
    pool = [
      { nombre: 'Café de grano premium & Leche', cantidadEspecifica: '1 bolsa de café 500g + 2L leche (entera y vegetal)', categoria: 'Bebidas', costoEstimado: '$7 - $9' },
      { nombre: 'Jugo de Naranja 100% Natural', cantidadEspecifica: '2 botellas de 1.5L bien frías', categoria: 'Bebidas', costoEstimado: '$5 - $7' },
      { nombre: 'Docena de Medialunas / Croissants', cantidadEspecifica: '12 medialunas recién horneadas', categoria: 'Panadería', costoEstimado: '$6 - $8' },
      { nombre: 'Sandwiches de Miga / Jamón y Queso', cantidadEspecifica: '1 bandeja de 12 unidades', categoria: 'Salado', costoEstimado: '$8 - $10' },
      { nombre: 'Fruta Fresca Picada Variada', cantidadEspecifica: 'Bowl con melón, frutillas y uvas (1.5 kg)', categoria: 'Frutas', costoEstimado: '$6 - $8' },
      { nombre: 'Yogurt Griego & Granola', cantidadEspecifica: '1 pote grande 1kg + bolsa de granola 300g', categoria: 'Saludable', costoEstimado: '$7 - $9' },
      { nombre: 'Huevos Revueltos con Tocino', cantidadEspecifica: 'Bandeja térmica para 6-8 porciones', categoria: 'Caliente', costoEstimado: '$8 - $10' },
      { nombre: 'Muffins y Cupcakes Variados', cantidadEspecifica: 'Caja surtida de 10 unidades', categoria: 'Dulce', costoEstimado: '$7 - $9' },
      { nombre: 'Queso Crema, Palta/Aguacate y Mermelada', cantidadEspecifica: '2 potes queso crema + 3 paltas listas', categoria: 'Complementos', costoEstimado: '$6 - $8' },
      { nombre: 'Vasos térmicos, Servilletas y Cubiertos', cantidadEspecifica: 'Paquete de 30 vasos + 50 servilletas + platos', categoria: 'Desechables', costoEstimado: '$4 - $6' },
      { nombre: 'Empanaditas de Queso y Jamón', cantidadEspecifica: '12 unidades horneadas listas para comer', categoria: 'Salado', costoEstimado: '$8 - $10' },
      { nombre: 'Té variado e Infusiones + Edulcorante', cantidadEspecifica: 'Caja surtida 30 saquitos + sobres azúcar/stevia', categoria: 'Bebidas', costoEstimado: '$4 - $6' },
      { nombre: 'Bagels surtidos', cantidadEspecifica: 'Bolsa de 8 bagels frescos', categoria: 'Panadería', costoEstimado: '$6 - $8' },
      { nombre: 'Galletas Artesanales de Avena y Chispas', cantidadEspecifica: '2 paquetes grandes (aprox 20 galletas)', categoria: 'Dulce', costoEstimado: '$5 - $7' },
    ];
  } else if (isMexican) {
    pool = [
      { nombre: 'Totopos / Tortilla Chips Artesanales', cantidadEspecifica: '3 bolsas grandes de 400g crujientes', categoria: 'Snacks', costoEstimado: '$5 - $7' },
      { nombre: 'Guacamole Fresco con Pico de Gallo', cantidadEspecifica: '2 bowls medianos (aprox 800g total)', categoria: 'Salsas', costoEstimado: '$7 - $9' },
      { nombre: 'Carne para Tacos o Tinga de Pollo', cantidadEspecifica: 'Recipiente térmico 1.2 kg preparado', categoria: 'Plato Fuerte', costoEstimado: '$10 - $13' },
      { nombre: 'Tortillas de Maíz y Harina', cantidadEspecifica: '3 paquetes de 12 tortillas c/u', categoria: 'Básicos', costoEstimado: '$4 - $6' },
      { nombre: 'Queso Rallado Surtido (Cheddar y Oaxaca)', cantidadEspecifica: '2 bolsas de 400g cada una', categoria: 'Complementos', costoEstimado: '$6 - $8' },
      { nombre: 'Salsas Mexicana (Verde taquera y Roja)', cantidadEspecifica: '2 frascos medianos (suave y picante)', categoria: 'Salsas', costoEstimado: '$5 - $7' },
      { nombre: 'Gaseosas y Aguas Saborizadas', cantidadEspecifica: '2 botellas de 2.5L bien frías', categoria: 'Bebidas', costoEstimado: '$5 - $7' },
      { nombre: 'Agua de Jamaica o Tamarindo', cantidadEspecifica: '3 Litros en jarra o botellas', categoria: 'Bebidas', costoEstimado: '$5 - $7' },
      { nombre: 'Crema ácida y Jalapeños encurtidos', cantidadEspecifica: '2 potes de crema + 1 lata grande jalapeños', categoria: 'Complementos', costoEstimado: '$5 - $7' },
      { nombre: 'Churros con Canela y Azúcar', cantidadEspecifica: 'Docena de churros con dip de manjar/cajeta', categoria: 'Postre', costoEstimado: '$7 - $9' },
      { nombre: 'Frijoles Refritos con Queso Cotija', cantidadEspecifica: '1 recipiente grande 800g listo para untar', categoria: 'Acompañamiento', costoEstimado: '$5 - $7' },
      { nombre: 'Platos Hondos, Servilletas y Tenedores', cantidadEspecifica: 'Paquete de 30 platos resistentes + 60 servilletas', categoria: 'Desechables', costoEstimado: '$5 - $6' },
    ];
  } else {
    // General food sharing / lunch / pizza / snacks
    pool = [
      { nombre: 'Empanadas Gourmet Horneadas', cantidadEspecifica: 'Bandeja de 10 unidades surtidas (carne/queso)', categoria: 'Salado', costoEstimado: '$8 - $11' },
      { nombre: 'Pizzas Medianas Familiares Variadas', cantidadEspecifica: '1 pizza grande cortada en porciones', categoria: 'Plato Fuerte', costoEstimado: '$9 - $12' },
      { nombre: 'Tabla de Quesos y Fiambres', cantidadEspecifica: 'Bandeja con gouda, jamón serrano y salame (400g)', categoria: 'Entrada', costoEstimado: '$9 - $12' },
      { nombre: 'Bebidas Gaseosas y Aguas Minerales', cantidadEspecifica: '2 botellas de 2.25L frías (Zero y Normal)', categoria: 'Bebidas', costoEstimado: '$5 - $7' },
      { nombre: 'Jugos de Fruta Natural y Limonada', cantidadEspecifica: '2 botellas de 1.5L bien heladas', categoria: 'Bebidas', costoEstimado: '$5 - $7' },
      { nombre: 'Snacks Salados (Papas fritas y Maní)', cantidadEspecifica: '2 bolsas grandes de papas + 1 mix frutos secos', categoria: 'Snacks', costoEstimado: '$6 - $8' },
      { nombre: 'Dip de Queso & Espinaca o Cebolla Caramelizada', cantidadEspecifica: '2 potes con crackers y tostaditas', categoria: 'Snacks', costoEstimado: '$6 - $8' },
      { nombre: 'Tarta Dulce o Brownies de Chocolate', cantidadEspecifica: 'Caja con 12 porciones generosas', categoria: 'Postre', costoEstimado: '$7 - $10' },
      { nombre: 'Ensalada César Fresca', cantidadEspecifica: 'Bowl grande con lechuga, pollo grillé y aderezo', categoria: 'Saludable', costoEstimado: '$8 - $10' },
      { nombre: 'Sandwiches Mini Surtidos de Miga', cantidadEspecifica: 'Bandeja de 12 sandwiches gourmet', categoria: 'Salado', costoEstimado: '$8 - $10' },
      { nombre: 'Frutas de Estación Listas para Comer', cantidadEspecifica: 'Uvas, mandarinas y manzanas lavadas (2 kg)', categoria: 'Frutas', costoEstimado: '$5 - $7' },
      { nombre: 'Hielos y Bebidas Frías', cantidadEspecifica: '2 bolsas de hielo 3kg + hielera o balde', categoria: 'Bebidas', costoEstimado: '$4 - $6' },
      { nombre: 'Set Completo de Platos, Servilletas y Vasos', cantidadEspecifica: '40 vasos descartables + 30 platos + servilletas', categoria: 'Desechables', costoEstimado: '$5 - $7' },
      { nombre: 'Alfajores o Galletitas Dulces Caseras', cantidadEspecifica: 'Caja de 12 alfajores artesanales', categoria: 'Postre', costoEstimado: '$6 - $9' },
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
      costoEstimado: template.costoEstimado || '$6 - $9',
    });
  }
  return items;
}

// API: Generate balanced potluck items with Gemini Structured Outputs
app.post('/api/generate-potluck-items', async (req: Request, res: Response) => {
  try {
    const { title, participantsCount, themeDescription, customBudget } = req.body;
    const count = parseInt(participantsCount, 10) || 10;
    const safeTitle = (title || 'Compartir de Oficina').trim();
    const safeDesc = (themeDescription || 'Comida rica, variada y equilibrada en costos').trim();
    const safeBudget = (customBudget || 'Gasto similar y moderado para cada compañero (~$5 a $10 por persona)').trim();

    // Check if Gemini API client is available or can be initialized
    const currentKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!aiClient && currentKey) {
      aiClient = new GoogleGenAI({
        apiKey: currentKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }

    if (aiClient) {
      try {
        const prompt = `Actúa como organizador experto de eventos corporativos de oficina.
Necesito exactamente ${count} ítems individuales para un compartir de comida titulado: "${safeTitle}".
Detalles o temática: "${safeDesc}".
Presupuesto / Directriz de equidad: "${safeBudget}".

REGLAS CRÍTICAS:
1. Debes devolver EXACTAMENTE ${count} ítems individuales en la lista (ni uno más, ni uno menos).
2. Cada ítem debe representar la contribución que llevará 1 persona específica.
3. El costo de cada ítem debe ser muy equilibrado y justo para que nadie gaste demasiado más que otro.
4. Debe haber una distribución armónica: platos principales/salados, bebidas, acompañamientos/snacks, postres/dulces y desechables/vajilla si aplica.
5. "cantidadEspecifica" debe ser clara y precisa para compras en supermercado (ej: "2 botellas de 1.5L", "1 bandeja de 12 empanadas", "1 paquete de 30 platos y 50 servilletas").
6. "costoEstimado" debe ser un rango realista en formato texto (ej: "$5 - $8", "$6 - $9").`;

        const response = await aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction:
              'Eres OfficeDrop AI. Generas listas de comida para dinámicas de oficina donde cada participante aporta algo justo, realista y delicioso.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: 'Identificador único como item-1, item-2' },
                  nombre: { type: Type.STRING, description: 'Nombre descriptivo del alimento o aporte' },
                  cantidadEspecifica: { type: Type.STRING, description: 'Cantidad exacta a comprar (ej: 2 Litros de jugo bien frío)' },
                  categoria: { type: Type.STRING, description: 'Categoría como Bebidas, Salado, Postre, Snacks, Desechables' },
                  costoEstimado: { type: Type.STRING, description: 'Rango de costo estimado equilibrado (ej: $5 - $8)' },
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
            // Guarantee unique ids
            const sanitized = parsed.map((it, idx) => ({
              id: it.id || `item-${idx + 1}-${Date.now().toString(36)}`,
              nombre: String(it.nombre || `Ítem ${idx + 1}`).trim(),
              cantidadEspecifica: String(it.cantidadEspecifica || '1 porción adecuada').trim(),
              categoria: String(it.categoria || 'Varios').trim(),
              costoEstimado: String(it.costoEstimado || '$5 - $8').trim(),
            }));
            return res.json({
              success: true,
              source: 'gemini-2.5-flash',
              items: sanitized,
            });
          }
        }
      } catch (geminiError: any) {
        console.warn('Gemini generation warning, falling back to smart curated items:', geminiError?.message || geminiError);
      }
    }

    // Fallback to high-quality smart items
    const fallbackItems = generateSmartFallbackItems(safeTitle, count, safeDesc, safeBudget);
    return res.json({
      success: true,
      source: 'smart-template-engine',
      items: fallbackItems,
    });
  } catch (error: any) {
    console.error('Error generating potluck items:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Error al procesar la lista con IA',
    });
  }
});

// Setup Vite middleware in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`OfficeDrop server running on http://localhost:${port}`);
  });
}

startServer();
