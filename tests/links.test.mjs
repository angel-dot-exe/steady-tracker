import test from 'node:test';
import assert from 'node:assert/strict';
import { linkedTickets, ticketKey } from '../src/links.ts';
const base={space:'work',done:false,title:'Example',jira:'https://example.atlassian.net/browse/ABC-12'};
test('several PRs share one ticket even with tracking parameters or a trailing slash',()=>{
 const items=[{...base,id:'pr1',kind:'pr'},{...base,id:'pr2',kind:'pr',jira:base.jira+'/?src=copy#details'},{...base,id:'jira1',kind:'jira',title:'Build the feature'}];
 const nodes=linkedTickets(items);assert.equal(nodes.length,1);assert.equal(nodes[0].title,'Build the feature');assert.equal(nodes[0].item.id,'jira1');
 assert.equal(ticketKey(items[0].jira),ticketKey(items[1].jira));
});
test('old PR links remain visible and unrelated Jira hosts stay distinct',()=>{
 const nodes=linkedTickets([{...base,kind:'pr'},{...base,kind:'pr',jira:'https://other.atlassian.net/browse/ABC-12'},{...base,kind:'jira',done:true,jira:'https://example.atlassian.net/browse/DONE-1'},{...base,kind:'jira',space:'personal',jira:'https://example.atlassian.net/browse/PERSONAL-1'}]);
 assert.equal(nodes.length,2);
});
