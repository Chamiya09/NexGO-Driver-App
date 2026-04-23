let driverToken: string | null = null;

export function setDriverToken(nextToken: string | null) {
  driverToken = nextToken;
}

export function getDriverToken() {
  return driverToken;
}

export function clearDriverToken() {
  driverToken = null;
}
