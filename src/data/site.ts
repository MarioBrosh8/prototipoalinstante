// Everything a non-developer might need to edit lives here: links, copy that
// comes from PROIN's Instagram, and which photo goes where.
//
// Copy is es-MX and uses no em or en dashes. Facts (prices, payments,
// deliveries) are taken verbatim from PROIN's "Cotizaciones" post on
// Instagram; if they change there, change them here.

import lamparaYael from "../assets/trabajos/lampara-yael.jpg";
import lamparaEsfera from "../assets/trabajos/lampara-esfera.jpg";
import esferaRecienImpresa from "../assets/trabajos/esfera-recien-impresa.jpg";
import trofeoGolf from "../assets/trabajos/trofeo-golf.jpg";
import llaverosMayoreo from "../assets/trabajos/llaveros-mayoreo.jpg";
import llaverosCarniceria from "../assets/trabajos/llaveros-carniceria.jpg";
import llaverosRobot from "../assets/trabajos/llaveros-robot.jpg";
import maquetaKnossos from "../assets/trabajos/maqueta-knossos.jpg";
import soporteRaspberry from "../assets/trabajos/soporte-raspberry.jpg";
import disenoCad from "../assets/trabajos/diseno-cad.jpg";
import llaveroLogo from "../assets/trabajos/llavero-logo.jpg";
import empaque from "../assets/trabajos/empaque.jpg";

export const site = {
  name: "PROIN",
  longName: "Prototipo al Instante",
  url: "https://prototipoalinstante.mariovaldez.dev",
  handle: "@prototipoalinstante",
  instagram: "https://www.instagram.com/prototipoalinstante/",
  // ig.me opens a DM thread in the Instagram app (or instagram.com on desktop).
  dm: "https://ig.me/m/prototipoalinstante",
  location: "Por metro Neza",
  areaServed: "CDMX y área metropolitana",
  description:
    "Diseño e impresión 3D por metro Neza: lámparas personalizadas, trofeos, llaveros para tu negocio, maquetas y piezas a medida. Cotizaciones por DM.",
};

/** One label per intent, used everywhere on the page. */
export const cta = {
  contact: "Cotiza por DM",
  instagram: "Ver Instagram",
};

export type Categoria = {
  id: string;
  titulo: string;
  texto: string;
  pieza: string;
  foto: ImageMetadata;
  alt: string;
};

export const categorias: Categoria[] = [
  {
    id: "lamparas",
    pieza: "Lámpara con nombre sobre columna griega",
    titulo: "Lámparas personalizadas",
    texto: "Con tu nombre, una figura o un patrón geométrico, hechas a la medida de tu espacio.",
    foto: lamparaYael,
    alt: "Lámpara encendida con el nombre YAEL sobre una columna griega impresa en 3D",
  },
  {
    id: "trofeos",
    pieza: "Trofeos para Marcelo's Masters 2026",
    titulo: "Trofeos",
    texto: "Para tu torneo o evento, con los detalles completamente a tu gusto.",
    foto: trofeoGolf,
    alt: "Trofeo de golf de primer lugar impreso en 3D con placa dorada de Marcelo's Masters 2026",
  },
  {
    id: "negocio",
    pieza: "Llaveros para Carnicería Falcon",
    titulo: "Llaveros para tu negocio",
    texto: "Con tu logo, para inauguraciones, aniversarios o fin de año. Tenemos precio por mayoreo.",
    foto: llaverosMayoreo,
    alt: "Montón de llaveros con el logo de Carnicería Falcon impresos en 3D",
  },
  {
    id: "maquetas",
    pieza: "Palacio de Knossos, para un proyecto escolar",
    titulo: "Maquetas y proyectos escolares",
    texto: "Maquetas arquitectónicas y piezas para exposiciones, tareas y presentaciones.",
    foto: maquetaKnossos,
    alt: "Maqueta del Palacio de Knossos impresa en 3D sobre la cama de la impresora",
  },
  {
    id: "piezas",
    pieza: "Soporte para dos cámaras Raspberry Pi",
    titulo: "Piezas funcionales a medida",
    texto: "Soportes, adaptadores y refacciones con las medidas exactas que necesitas.",
    foto: soporteRaspberry,
    alt: "Soportes naranja y blanco para cámaras Raspberry Pi, frente al logo de PROIN en un monitor",
  },
  {
    id: "diseno",
    pieza: "Tapa para un módulo de cámara, en diseño",
    titulo: "Diseño 3D desde cero",
    texto: "¿No tienes archivo? Lo modelamos contigo. Desde $150 MXN, con dos revisiones incluidas.",
    foto: disenoCad,
    alt: "Modelo 3D naranja de la tapa de un módulo de cámara, visto en el programa de diseño",
  },
];

export const marquesina = [
  "Lámparas",
  "Trofeos",
  "Llaveros",
  "Maquetas",
  "Piezas a medida",
  "Deco y eventos",
  "Nichos",
  "Proyectos escolares",
];

export type Paso = { verbo: string; texto: string; dato: string; icono: "chat-circle-dots" | "cube" | "printer" | "package" };

export const pasos: Paso[] = [
  {
    verbo: "Cuéntanos",
    dato: "Por mensaje directo",
    texto: "Mándanos DM con lo que tienes en mente, medidas aproximadas y si ya tienes archivo STL.",
    icono: "chat-circle-dots",
  },
  {
    verbo: "Diseñamos",
    dato: "Diseño desde $150 MXN",
    texto: "Si no hay archivo, lo modelamos. Si ya lo tienes, lo revisamos y hacemos ajustes pequeños sin costo.",
    icono: "cube",
  },
  {
    verbo: "Imprimimos",
    dato: "50% de anticipo",
    texto: "Con el archivo listo te damos el precio final. Arrancamos con 50% de anticipo.",
    icono: "printer",
  },
  {
    verbo: "Entregamos",
    dato: "Metro CDMX sin costo",
    texto: "Sin costo en estaciones del metro de CDMX, previo acuerdo, o a domicilio en el área metropolitana.",
    icono: "package",
  },
];

export type Trabajo = {
  titulo: string;
  tipo: string;
  foto: ImageMetadata;
  alt: string;
  post: string;
};

const ig = (path: string) => `https://www.instagram.com/prototipoalinstante/${path}/`;

export const trabajos: Trabajo[] = [
  {
    titulo: "Lámpara esférica",
    tipo: "Diseñada para una oficina",
    foto: lamparaEsfera,
    alt: "Lámpara esférica negra con celosía de rombos encendida, con base cobre",
    post: ig("reel/DVfR45PjRof"),
  },
  {
    titulo: "Recién impresa",
    tipo: "La misma esfera, antes de encenderla",
    foto: esferaRecienImpresa,
    alt: "Esfera de celosía negra recién impresa, sostenida sobre la cama de la impresora",
    post: ig("reel/DVaGdILinmp"),
  },
  {
    titulo: "Carnicería Poncho",
    tipo: "Llaveros para negocio",
    foto: llaverosCarniceria,
    alt: "Dos llaveros en forma de vaca con el texto Local 12 Carnicería Poncho",
    post: ig("p/DbZkURpCVrB"),
  },
  {
    titulo: "Soporte para cámaras",
    tipo: "Proyecto de un estudiante",
    foto: soporteRaspberry,
    alt: "Soporte de dos cámaras Raspberry Pi impreso en naranja y blanco",
    post: ig("reel/DVRNrbCDEtv"),
  },
  {
    titulo: "Nuestro logo, en llavero",
    tipo: "Llaveros",
    foto: llaveroLogo,
    alt: "Llavero naranja y blanco con la boquilla y el ojo del logo de PROIN",
    post: ig("reel/DVWJq_AjTKB"),
  },
  {
    titulo: "Local 564",
    tipo: "Llaveros para negocio",
    foto: llaverosRobot,
    alt: "Llavero de robot y llavero con el texto Local 564 Electrónica Robótica Eléctrica",
    post: ig("p/DbZkURpCVrB"),
  },
  {
    titulo: "Marcelo's Masters 2026",
    tipo: "Trofeos",
    foto: trofeoGolf,
    alt: "Trofeo de golf verde con pelota blanca sobre base negra y placa dorada",
    post: ig("p/Db9rNDhDQJl"),
  },
];

export type Tema = {
  id: string;
  tab: string;
  titulo: string;
  puntos: string[];
  destacado?: { valor: string; nota: string };
  foto: ImageMetadata;
  alt: string;
};

export const temas: Tema[] = [
  {
    id: "impresion",
    tab: "Impresión",
    titulo: "Cómo se cotiza una impresión",
    puntos: [
      "Se cotiza según el tamaño, el material y la complejidad de la pieza.",
      "El precio final se define al terminar el diseño o al laminar tu archivo STL.",
      "Se requiere 50% de anticipo para iniciar y el 50% restante se paga contra entrega.",
      "Contamos con precio por mayoreo.",
    ],
    foto: esferaRecienImpresa,
    alt: "Esfera de celosía recién impresa sobre la cama de la impresora",
  },
  {
    id: "diseno",
    tab: "Diseño 3D",
    titulo: "Diseño desde cero",
    destacado: { valor: "$150", nota: "MXN desde, aparte de la impresión" },
    puntos: [
      "El diseño se paga por adelantado para comenzar.",
      "Incluye hasta 2 revisiones sin costo. Las adicionales tienen costo extra.",
      "Si el producto final supera los $500 MXN, el diseño desde cero queda a cuenta.",
    ],
    foto: disenoCad,
    alt: "Modelo 3D de una pieza naranja en el programa de diseño",
  },
  {
    id: "archivo",
    tab: "Tu archivo STL",
    titulo: "Si ya tienes archivo",
    puntos: [
      "Trabajamos con archivos proporcionados por el cliente.",
      "Los ajustes pequeños no tienen costo.",
      "Los cambios mayores pueden generar un costo adicional.",
      "Aplica también para diseños hechos por nosotros.",
    ],
    foto: soporteRaspberry,
    alt: "Soporte para cámaras adaptado a partir del archivo de un estudiante",
  },
  {
    id: "pagos",
    tab: "Pagos",
    titulo: "Métodos de pago",
    puntos: [
      "Tarjeta de crédito o débito.",
      "Transferencia bancaria a Mercado Pago.",
      "Efectivo contra entrega.",
    ],
    foto: llaverosMayoreo,
    alt: "Pedido de llaveros por mayoreo listo para entregar",
  },
  {
    id: "entregas",
    tab: "Entregas",
    titulo: "Entregas y envíos",
    puntos: [
      "Entregas sin costo en cualquier estación del metro de CDMX, previo acuerdo.",
      "Envíos a domicilio en el área metropolitana.",
      "Por el momento no hacemos envíos a otros estados.",
    ],
    foto: empaque,
    alt: "Bolsa morada de PROIN con un pedido listo para entregar",
  },
];
