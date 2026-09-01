import packageJson from '../../package.json';

export const GAME_VERSION = packageJson.version;
export const GAME_NAME = 'Solarmax Zero';

export const getVersionString = () => `${GAME_NAME} v${GAME_VERSION}`;
