const en: Record<string, string> = {
  "button-a": "Button A",
  "button-b": "Button B",
  "touch-logo": "Touch logo",
  "start-simulator": "Start simulator",
};

export const formattedMessage = ({ id }: { id: string }): string => {
  const result = en[id];
  if (!result) {
    console.trace(`No string for code ${id}`);
  }
  return result ?? id;
};
