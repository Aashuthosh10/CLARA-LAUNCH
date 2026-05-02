import type { CampusDirection } from './campusDirections';
import { matchCampusDestinationIndex } from './matchCampusDestination';

export function matchCampusTranscriptLocal(transcript: string, directions: CampusDirection[]): number | null {
  return matchCampusDestinationIndex(transcript, directions);
}
