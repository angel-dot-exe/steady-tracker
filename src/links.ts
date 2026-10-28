import type { Item } from './types';

export const ticketKey = (value: string) => {
  if (!value) return '';
  try {
    const url = new URL(value);
    const key = url.pathname.match(/\/browse\/([a-z][a-z0-9_]*-\d+)/i)?.[1];
    return url.origin + (key ? `/browse/${key.toUpperCase()}` : url.pathname.replace(/\/+$/, ''));
  } catch { return value; }
};
export const ticketLabel = (value: string) => {
  try { return new URL(value).pathname.match(/([a-z][a-z0-9_]*-\d+)/i)?.[1].toUpperCase() || 'Jira ticket'; }
  catch { return 'Jira ticket'; }
};
export type TicketNode = { key: string; url: string; title: string; item?: Item };
export function linkedTickets(items: Item[]): TicketNode[] {
  const tickets = new Map<string, TicketNode>();
  // Saved tickets supply names; old PR links also remain visible without migration.
  for (const item of items.filter(i => i.space === 'work' && i.kind === 'jira' && !i.done && i.jira)) {
    const key = ticketKey(item.jira);
    tickets.set(key, { key, url: item.jira, title: item.title, item });
  }
  for (const item of items.filter(i => i.space === 'work' && i.kind === 'pr' && !i.done && i.jira)) {
    const key = ticketKey(item.jira);
    if (!tickets.has(key)) tickets.set(key, { key, url: item.jira, title: ticketLabel(item.jira) });
  }
  return [...tickets.values()];
}
