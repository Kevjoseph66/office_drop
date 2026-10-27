export type EventType = 'potluck' | 'raffle';

export interface PotluckItem {
  id: string;
  nombre: string;
  cantidadEspecifica: string;
  categoria: string;
  costoEstimado: string;
  assignedTo?: string | null;
  assignedAt?: string | null;
  assignedDeviceId?: string | null;
}

export interface RaffleTicket {
  ticketNumber: number;
  userName: string;
  joinedAt: string;
  deviceId?: string | null;
}

export interface OfficeEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  createdAt: string;
  status: 'draft' | 'published';
  targetParticipants: number;
  // Potluck fields
  items: PotluckItem[];
  // Raffle fields
  prizeTitle?: string;
  prizeDescription?: string;
  prizeIcon?: string;
  tickets: RaffleTicket[];
  winnerTicket?: RaffleTicket | null;
  winnerSelectedAt?: string | null;
}

export interface SimulationUser {
  id: string;
  name: string;
  avatarColor: string;
  role: 'organizer' | 'participant';
}
