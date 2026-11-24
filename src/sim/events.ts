export const SimEvent = {
  Jump: 'jump',
  AirJump: 'airJump',
  WallKick: 'wallKick',
  Land: 'land',
  Step: 'step',
  Dodge: 'dodge',
  DodgeTrail: 'dodgeTrail',
} as const;

export interface SimEventData {
  type: string;
  fighterId: number;
  x: number;
  y: number;
  dir: number;
  power: number;
  tint: number;
  angle?: number;
  index?: number;
}
