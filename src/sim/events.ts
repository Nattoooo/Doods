export const SimEvent = {
  Jump: 'jump',
  AirJump: 'airJump',
  WallKick: 'wallKick',
  Land: 'land',
  Step: 'step',
  Teleport: 'teleport',
} as const;

export interface SimEventData {
  type: string;
  fighterId: number;
  x: number;
  y: number;
  dir: number;
  power: number;
  tint: number;
  toX?: number;
  toY?: number;
}
