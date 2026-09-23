// Filament swatches for the hero's 3D print. Colors are taken from PROIN's
// real prints (the black lattice lamp, the orange camera mounts, the silk
// green trophies, the yellow YAEL lamp) plus their brand violet.
// `transl` is how much light a thin wall lets through when the lamp is on.

export type Filament = {
  id: string;
  name: string;
  color: string;
  transl: number;
  spec: number;
};

export const FILAMENTS: Filament[] = [
  { id: "morado", name: "Morado PROIN", color: "#8a3bc1", transl: 0.22, spec: 0.3 },
  { id: "negro", name: "Negro mate", color: "#1d1b21", transl: 0, spec: 0.16 },
  { id: "blanco", name: "Blanco", color: "#ecebf0", transl: 0.55, spec: 0.22 },
  { id: "naranja", name: "Naranja", color: "#ff6a1f", transl: 0.34, spec: 0.26 },
  { id: "verde", name: "Verde seda", color: "#86b980", transl: 0.2, spec: 0.75 },
  { id: "amarillo", name: "Amarillo", color: "#ffcf2e", transl: 0.48, spec: 0.24 },
];

export const DEFAULT_FILAMENT = "morado";
