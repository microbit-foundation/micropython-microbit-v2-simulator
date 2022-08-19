import { RadioMessage } from "./sensors";

export function clamp(value: number, min: number, max: number) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

export function capRadioMessages(
  radioMessages: RadioMessage[]
): RadioMessage[] {
  const cappedRadioMessages: RadioMessage[] = [];
  const uniqueGroups = new Set(radioMessages.map((m) => m.group));
  const radioMessagesByGroup: Record<string, RadioMessage[]> = {};
  uniqueGroups.forEach((group) => {
    radioMessagesByGroup[group] = radioMessages.filter(
      (m) => m.group === group
    );
  });
  for (const group in radioMessagesByGroup) {
    const messages = radioMessagesByGroup[group];
    while (messages.length > 101) {
      messages.shift();
    }
    cappedRadioMessages.push(...messages);
  }
  return cappedRadioMessages;
}
