
import {findRule,applySavedPolicy,DEFAULT_POLICY} from './organisation.js';
export const DEFAULT_RULES = [{ id: 'github', domain: 'github.com/*', group: 'GitHub', color: 'random' }];
export function matchingRule(url,rules,title='') {
  const rule=findRule({url,title},rules);
  return rule?.exclude?null:(rule||undefined);
}
export function arrangeSaved(c,rules) { return applySavedPolicy(c,DEFAULT_POLICY,rules); }
