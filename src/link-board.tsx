import { useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { ArrowUpRight, Check, GitPullRequest, Plus, Ticket, Unlink, X } from 'lucide-react';
import type { Item } from './types';
import { linkedTickets, ticketKey, ticketLabel } from './links';

type Point = { x: number; y: number };
type Wire = { id: string; from: Point; to: Point };
const curve = (a: Point, b: Point) => {
  const bend = Math.max(24, Math.abs(b.x - a.x) * .55);
  return `M ${a.x} ${a.y} C ${a.x + bend} ${a.y}, ${b.x - bend} ${b.y}, ${b.x} ${b.y}`;
};
export default function LinkBoard({ items, query, saving, onAdd, onEdit, onComplete, onLink }: {
  items: Item[]; query: string; saving: boolean;
  onAdd: (kind: 'pr' | 'jira') => void; onEdit: (item: Item) => void;
  onComplete: (item: Item) => void; onLink: (item: Item, url: string) => Promise<boolean>;
}) {
  const board = useRef<HTMLDivElement>(null);
  const ports = useRef(new Map<string, HTMLButtonElement>());
  const gesture = useRef<{ id: string; start: Point; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [wires, setWires] = useState<Wire[]>([]);
  const [starts, setStarts] = useState<Record<string, Point>>({});
  const [message, setMessage] = useState('');
  const allPRs = items.filter(i => i.space === 'work' && i.kind === 'pr' && !i.done).sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  const allTickets = linkedTickets(items).sort((a, b) => a.key.localeCompare(b.key));
  const search = query.toLowerCase().trim();
  const matches = (text: string) => !search || text.toLowerCase().includes(search);
  const matchingTickets = new Set(allTickets.filter(t => matches(`${t.title} ${t.url}`)).map(t => t.key));
  const prs = allPRs.filter(p => matches(`${p.title} ${p.notes} ${p.pr} ${p.jira}`) || matchingTickets.has(ticketKey(p.jira)));
  const tickets = allTickets.filter(t => matchingTickets.has(t.key) || prs.some(p => ticketKey(p.jira) === t.key));
  const layoutKey = JSON.stringify([prs, tickets]);
  useLayoutEffect(() => {
    const measure = () => {
      const bounds = board.current?.getBoundingClientRect();
      if (!bounds) return;
      const point = (key: string) => {
        const rect = ports.current.get(key)?.getBoundingClientRect();
        return rect ? { x: rect.left + rect.width / 2 - bounds.left, y: rect.top + rect.height / 2 - bounds.top } : null;
      };
      const nextStarts: Record<string, Point> = {};
      const next: Wire[] = [];
      for (const pr of prs) {
        const from = point(`pr:${pr.id}`), to = point(`jira:${ticketKey(pr.jira)}`);
        if (from) nextStarts[pr.id] = from;
        if (from && to) next.push({ id: pr.id, from, to });
      }
      setStarts(nextStarts); setWires(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (board.current) observer.observe(board.current);
    for (const el of ports.current.values()) if (el.parentElement) observer.observe(el.parentElement);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [layoutKey]);
  const portRef = (key: string) => (el: HTMLButtonElement | null) => {
    if (el) ports.current.set(key, el); else ports.current.delete(key);
  };
  const cancel = () => { setSelected(null); setPointer(null); gesture.current = null; };
  const connect = async (id: string, url: string) => {
    const pr = allPRs.find(p => p.id === id);
    if (!pr || saving) return;
    setPointer(null);
    if (ticketKey(pr.jira) === ticketKey(url)) { cancel(); return; }
    if (await onLink(pr, url)) { cancel(); setMessage(url ? `Linked ${pr.title} to ${ticketLabel(url)}.` : `Unlinked ${pr.title}.`); }
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const g = gesture.current, bounds = board.current?.getBoundingClientRect();
    if (!g || !bounds) return;
    if (Math.hypot(e.clientX - g.start.x, e.clientY - g.start.y) > 5) g.moved = true;
    if (g.moved) setPointer({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
  };
  const release = (e: PointerEvent<HTMLButtonElement>) => {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null; setPointer(null);
    if (g.moved) {
      suppressClick.current = true;
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-ticket-url]');
      if (target?.dataset.ticketUrl) void connect(g.id, target.dataset.ticketUrl);
    }
  };
  const active = prs.find(p => p.id === selected);
  return <section className="link-workspace" aria-label="Link pull requests to Jira tickets" onKeyDown={e => { if (e.key === 'Escape') cancel(); }}>
    <div className={`link-instruction ${active ? 'choosing' : ''}`} role="status">
      <span>{active ? `Now choose a Jira ticket for “${active.title}”.` : 'Draw a line from a PR dot to a Jira dot. Or tap the two dots.'}</span>
      {active && <button onClick={cancel} aria-label="Cancel linking"><X size={16}/> Cancel</button>}
    </div>
    <div className="link-board" ref={board}>
      <svg className="link-wires" aria-hidden="true" width="100%" height="100%">
        {wires.map(w => <path key={w.id} d={curve(w.from, w.to)} className={selected === w.id ? 'wire selected' : 'wire'}/>)}
        {active && pointer && starts[active.id] && <path d={curve(starts[active.id], pointer)} className="wire drawing"/>}
      </svg>
      <div className="link-column pr-column">
        <header><h2><GitPullRequest size={17}/> PRs <small>{prs.length}</small></h2><button onClick={() => onAdd('pr')} aria-label="Add pull request"><Plus size={18}/></button></header>
        {prs.map(pr => <article className={`link-card pr-card ${selected === pr.id ? 'selected' : ''}`} key={pr.id}>
          <button className="node-title" onClick={() => onEdit(pr)}>{pr.title}</button>
          {pr.pr && <a className="node-url" href={pr.pr} target="_blank" rel="noreferrer">Open PR <ArrowUpRight size={13}/></a>}
          {pr.notes && <p className="node-note">{pr.notes}</p>}
          <div className="node-actions"><button onClick={() => onComplete(pr)} disabled={saving} aria-label={`Complete ${pr.title}`}><Check size={14}/> Done</button>{pr.jira && <button onClick={() => void connect(pr.id, '')} disabled={saving} aria-label={`Unlink ${pr.title} from ${ticketLabel(pr.jira)}`}><Unlink size={14}/> Unlink</button>}</div>
          <span className="sr-only">{pr.jira ? `Linked to ${ticketLabel(pr.jira)}` : 'No Jira ticket linked'}</span>
          <button className={`link-port pr-port ${pr.jira ? 'connected' : ''}`} ref={portRef(`pr:${pr.id}`)} aria-label={`Link ${pr.title} to a Jira ticket`} aria-pressed={selected === pr.id} disabled={saving}
            onPointerDown={e => { if (e.button !== 0) return; suppressClick.current = false; gesture.current = { id: pr.id, start: { x: e.clientX, y: e.clientY }, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); setSelected(pr.id); }}
            onPointerMove={move} onPointerUp={release} onPointerCancel={cancel}
            onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } setSelected(pr.id); }}/>
        </article>)}
        {!prs.length && <button className="board-empty" onClick={() => onAdd('pr')}><Plus size={20}/><strong>{search ? 'No matching PRs' : 'Add your first PR'}</strong><span>A link is all you need.</span></button>}
      </div>
      <div className="link-column jira-column">
        <header><h2><Ticket size={17}/> Jira <small>{tickets.length}</small></h2><button onClick={() => onAdd('jira')} aria-label="Add Jira ticket"><Plus size={18}/></button></header>
        {tickets.map(ticket => <article className={`link-card jira-card ${active ? 'link-target' : ''}`} key={ticket.key} data-ticket-url={ticket.url}>
          <button className="link-port jira-port" ref={portRef(`jira:${ticket.key}`)} aria-label={`Connect selected PR to ${ticketLabel(ticket.url)}`} disabled={saving || !active} onClick={() => { if (active) void connect(active.id, ticket.url); }}/>
          <a className="ticket-label" href={ticket.url} target="_blank" rel="noreferrer">{ticketLabel(ticket.url)} <ArrowUpRight size={13}/></a>
          {ticket.item ? <button className="node-title" onClick={() => onEdit(ticket.item!)}>{ticket.title}</button> : ticket.title !== ticketLabel(ticket.url) && <p className="node-title">{ticket.title}</p>}
          <p className="ticket-count">{allPRs.filter(p => ticketKey(p.jira) === ticket.key).length} {allPRs.filter(p => ticketKey(p.jira) === ticket.key).length === 1 ? 'PR' : 'PRs'} linked</p>
          {ticket.item && <div className="node-actions"><button disabled={saving} onClick={() => onComplete(ticket.item!)} aria-label={`Complete ${ticket.title}`}><Check size={14}/> Done</button></div>}
        </article>)}
        {!tickets.length && <button className="board-empty" onClick={() => onAdd('jira')}><Plus size={20}/><strong>{search ? 'No matching tickets' : 'Add a Jira ticket'}</strong><span>Many PRs can meet here.</span></button>}
      </div>
    </div>
    <p className="sr-only" role="status">{message}</p>
  </section>;
}
