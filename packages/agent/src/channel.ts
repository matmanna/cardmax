// A messaging provider (Twilio, Photon, ...) is one small file implementing Channel.
// Everything else in the agent is shared.
export type Inbound = { from: string; text?: string; imageUrl?: string };

export interface Channel {
	parse(request: Request): Promise<Inbound | null>; // verify the signature, then normalize
	reply(to: string, text: string): Promise<void>;
	deleteMedia?(inbound: Inbound): Promise<void>; // after a photo is handled
}
