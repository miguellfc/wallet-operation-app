export type DataSource = 'local' | 'remote';

export const dataSource: DataSource = process.env.EXPO_PUBLIC_DATA_SOURCE === 'local' ? 'local' : 'remote';

export const isLocal = dataSource === 'local';
