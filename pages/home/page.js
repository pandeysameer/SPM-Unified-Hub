import {html, nothing} from 'lit';
import {customElement} from 'lit/decorators.js';
import {AIUXElement, aiuxFetch} from '@servicenow/aiux/aiux-components-core';
import {i18n} from '@servicenow/aiux/aiux-services';
import {setDocumentTitle} from '../../utils/document-title.js';
import '@servicenow/aiux-components-visualizations-matrix';

const API_BASE = '/api/x_custom_spm_hub/v1/spm_hub';

const DEMANDS = [
  {sys_id: 'a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1', number: 'DMN004218', short_description: 'Fleet electrification phase two', state: 'Screening', score: '86', financial_return: '480000', risk: 'Low'},
  {sys_id: 'b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2', number: 'DMN004216', short_description: 'Warehouse operations modernization', state: 'Qualified', score: '79', financial_return: '720000', risk: 'High'},
  {sys_id: 'c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3', number: 'DMN004209', short_description: 'Unified supplier onboarding', state: 'Screening', score: '72', financial_return: '260000', risk: 'Medium'},
  {sys_id: 'd4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4', number: 'DMN004201', short_description: 'Customer service knowledge refresh', state: 'Submitted', score: '64', financial_return: '145000', risk: 'Low'}
];

const PROJECTS = [
  {sys_id: 'e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5', number: 'PRJ001804', short_description: 'Service portal consolidation', top_portfolio: 'Customer experience', phase: 'Execution', percent_complete: '68', state: 'Work in Progress', start_date: '2026-03-01', end_date: '2026-12-18'},
  {sys_id: 'f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6', number: 'PRJ001792', short_description: 'ERP integration uplift', top_portfolio: 'Enterprise systems', phase: 'Execution', percent_complete: '37', state: 'On Hold', start_date: '2026-01-15', end_date: '2026-11-30'},
  {sys_id: '17171717171717171717171717171717', number: 'PRJ001766', short_description: 'Field service scheduling', top_portfolio: 'Operations excellence', phase: 'Planning', percent_complete: '22', state: 'Work in Progress', start_date: '2026-05-10', end_date: '2027-02-12'}
];

const RESOURCES = [
  {sys_id: '28282828282828282828282828282828', number: 'RPL001104', short_description: 'Platform engineering allocation', assigned_to: '38383838383838383838383838383838', assigned_to_display: 'Maya Chen', allocated_hours: '28', utilization: '70', role: 'Platform engineer'},
  {sys_id: '29292929292929292929292929292929', number: 'RPL001098', short_description: 'Data migration workstream', assigned_to: '39393939393939393939393939393939', assigned_to_display: 'Owen Patel', allocated_hours: '38', utilization: '95', role: 'Data architect'},
  {sys_id: '30303030303030303030303030303030', number: 'RPL001091', short_description: 'Service design and research', assigned_to: '40404040404040404040404040404040', assigned_to_display: 'Avery Brooks', allocated_hours: '44', utilization: '110', role: 'Service designer'},
  {sys_id: '31313131313131313131313131313131', number: 'RPL001085', short_description: 'Quality engineering support', assigned_to: '38383838383838383838383838383838', assigned_to_display: 'Maya Chen', allocated_hours: '22', utilization: '55', role: 'Quality engineer'}
];

function amount(value) {
  return Number(String(value || '0').replace(/[^\d.-]/g, '')) || 0;
}

function currency(value) {
  return new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0}).format(amount(value));
}

function riskOf(demand) {
  const risk = String(demand.risk_display || demand.risk || '').toLowerCase();
  if (risk.includes('high') || Number(risk) >= 3) return 'High';
  if (risk.includes('med') || Number(risk) === 2) return 'Medium';
  return 'Low';
}

function riskTone(risk) {
  return risk === 'High' ? 'error' : risk === 'Medium' ? 'warning' : 'success';
}

function global() {
  return page => page;
}

function roiRiskData(demands) {
  const cells = new Map();
  demands.forEach(demand => {
    const roi = amount(demand.financial_return) >= 400000 ? 'High' : amount(demand.financial_return) >= 180000 ? 'Medium' : 'Low';
    const risk = riskOf(demand);
    const key = `${roi}|${risk}`;
    cells.set(key, (cells.get(key) || 0) + 1);
  });
  return {
    metadata: {
      columns: {
        roi: {type: 'categorical', meaning: 'dimension', order: 0},
        risk: {type: 'categorical', meaning: 'dimension', order: 1},
        demand_count: {type: 'numerical', meaning: 'metric', order: 2, label: i18n.getMessage('Demand count')}
      }
    },
    data: Array.from(cells, ([key, count]) => [...key.split('|'), String(count)]),
    rendering: {columns: {roi: {role: 'grouping'}, risk: {role: 'grouping'}, demand_count: {role: 'value'}}}
  };
}

function stateLabel(project) {
  const value = String(project.state_display || project.state || '').trim();
  const values = {'1': 'Pending', '2': 'Work in Progress', '3': 'Closed Complete', '4': 'Closed Incomplete', '7': 'On Hold'};
  return values[value] || value || i18n.getMessage('Unspecified');
}

function healthOf(project) {
  const state = stateLabel(project).toLowerCase();
  if (state.includes('hold') || state.includes('incomplete') || state.includes('blocked') || state.includes('pending')) return 'attention';
  if (state.includes('progress') || state.includes('complete') || state.includes('active') || state.includes('on track')) return 'healthy';
  return 'attention';
}

function utilizationTone(value) {
  const utilization = amount(value);
  return utilization > 100 ? 'error' : utilization >= 80 ? 'warning' : 'success';
}

function formatDate(value) {
  if (!value) return i18n.getMessage('Date not set');
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric'}).format(date);
}

function projectTimeline(project, projects) {
  const validDates = projects
    .flatMap(item => [Date.parse(item.start_date), Date.parse(item.end_date)])
    .filter(Number.isFinite);
  const start = validDates.length ? Math.min(...validDates) : Date.UTC(2026, 0, 1);
  const end = validDates.length ? Math.max(...validDates) : Date.UTC(2026, 11, 31);
  const span = Math.max(end - start, 1);
  const projectStart = Date.parse(project.start_date);
  const projectEnd = Date.parse(project.end_date);
  const offset = Number.isFinite(projectStart) ? ((projectStart - start) / span) * 100 : 0;
  const width = Number.isFinite(projectStart) && Number.isFinite(projectEnd)
    ? ((projectEnd - projectStart) / span) * 100
    : 100;
  return {
    offset: Math.max(0, Math.min(98, offset)),
    width: Math.max(2, Math.min(100 - offset, width)),
    progress: Math.max(0, Math.min(100, amount(project.percent_complete)))
  };
}

async function postAction(path, data) {
  const response = await aiuxFetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('SPM action failed');
  return response.json();
}

@global(false)
@customElement('x-spm-unified-hub-home-page')
export default class HomePage extends AIUXElement {
  static properties = {
    _activeView: {state: true},
    _demands: {state: true},
    _projects: {state: true},
    _resources: {state: true},
    _query: {state: true},
    _dataMode: {state: true},
    _assistantOpen: {state: true},
    _messages: {state: true},
    _assistantSending: {state: true},
    _conversionDemand: {state: true},
    _conversionStep: {state: true},
    _conversionPortfolio: {state: true},
    _conversionMessage: {state: true},
    _swapPlan: {state: true},
    _swapAssignee: {state: true},
    _swapHours: {state: true},
    _swapMessage: {state: true},
    _busy: {state: true}
  };

  constructor() {
    super();
    this._activeView = 'demand';
    this._demands = DEMANDS;
    this._projects = PROJECTS;
    this._resources = RESOURCES;
    this._query = '';
    this._dataMode = 'connecting';
    this._assistantOpen = false;
    this._messages = [];
    this._assistantSending = false;
    this._conversionDemand = null;
    this._conversionStep = 0;
    this._conversionPortfolio = '';
    this._conversionMessage = '';
    this._swapPlan = null;
    this._swapAssignee = '';
    this._swapHours = '';
    this._swapMessage = '';
    this._busy = false;
  }

  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    setDocumentTitle(i18n.getMessage('SPM Unified Hub'));
    this._loadWorkspace();
  }

  async _loadWorkspace() {
    try {
      const response = await aiuxFetch(`${API_BASE}/workspace`);
      if (!response.ok) throw new Error('Workspace unavailable');
      const payload = await response.json();
      const data = payload.result?.result || payload.result || payload;
      this._demands = Array.isArray(data.demands) ? data.demands : [];
      this._projects = Array.isArray(data.projects) ? data.projects : [];
      this._resources = Array.isArray(data.resources) ? data.resources : [];
      this._dataMode = 'live';
      this._announceWorkspace('loaded');
    } catch {
      this._dataMode = 'demo';
    }
  }
  _announceWorkspace(reason) {
    this.dispatchEvent(new CustomEvent('spm:workspace-updated', {
      detail: {reason, demands: this._demands, projects: this._projects, resources: this._resources},
      bubbles: true,
      composed: true
    }));
  }

  _chooseView(event) {
    const view = event.currentTarget.dataset.view;
    this._activeView = view;
    this.dispatchEvent(new CustomEvent('spm:view-changed', {detail: {view}, bubbles: true, composed: true}));
  }

  _tabKeydown(event) {
    const tabs = Array.from(this.querySelectorAll('[role="tab"]'));
    const index = tabs.indexOf(event.target);
    const next = event.key === 'ArrowDown' || event.key === 'ArrowRight'
      ? (index + 1) % tabs.length
      : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
        ? (index - 1 + tabs.length) % tabs.length
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? tabs.length - 1
            : index;
    if (next === index) return;
    event.preventDefault();
    tabs[next]?.focus();
  }

  _filterDemands(event) {
    this._query = event.currentTarget.value;
  }

  _emitConvert(event) {
    const demand = this._demands.find(record => record.sys_id === event.currentTarget.dataset.id);
    if (demand) event.currentTarget.dispatchEvent(new CustomEvent('spm:convert-demand', {detail: {demand}, bubbles: true, composed: true}));
  }

  _beginConversion(event) {
    this._conversionDemand = event.detail.demand;
    this._conversionStep = 0;
    this._conversionPortfolio = '';
    this._conversionMessage = '';
    this.updateComplete.then(() => this.querySelector('#spm-convert-dialog')?.showModal());
  }

  _closeConversion() {
    this.querySelector('#spm-convert-dialog')?.close();
    this._conversionDemand = null;
    this._conversionMessage = '';
  }

  async _advanceConversion() {
    if (this._conversionStep < 2) {
      this._conversionStep += 1;
      return;
    }
    if (this._busy || !this._conversionDemand) return;
    this._busy = true;
    this._conversionMessage = '';
    try {
      const demand = this._conversionDemand;
      const payload = await postAction('/demands/convert', {demandSysId: demand.sys_id, topPortfolio: this._conversionPortfolio});
      const result = payload.result?.result || payload.result || payload;
      this._demands = this._demands.filter(record => record.sys_id !== demand.sys_id);
      this._projects = [{
        sys_id: result.projectSysId,
        number: i18n.getMessage('New project'),
        short_description: demand.short_description,
        top_portfolio: this._conversionPortfolio,
        phase: i18n.getMessage('Planning'),
        percent_complete: '0',
        state: 'Pending',
        state_display: i18n.getMessage('Pending')
      }, ...this._projects];
      this._conversionMessage = i18n.getMessage('Project created and demand converted.');
      this._announceWorkspace('demand-converted');
      this._loadWorkspace();
    } catch {
      this._conversionMessage = i18n.getMessage('The server action could not complete this conversion. Check access and try again.');
    } finally {
      this._busy = false;
    }
  }

  _emitSwap(event) {
    const plan = this._resources.find(record => record.sys_id === event.currentTarget.dataset.id);
    if (plan) event.currentTarget.dispatchEvent(new CustomEvent('spm:resource-swap', {detail: {plan}, bubbles: true, composed: true}));
  }

  _beginSwap(event) {
    this._swapPlan = event.detail.plan;
    this._swapAssignee = event.detail.plan.assigned_to || '';
    this._swapHours = event.detail.plan.allocated_hours || '';
    this._swapMessage = '';
    this.updateComplete.then(() => this.querySelector('#spm-swap-dialog')?.showModal());
  }

  _closeSwap() {
    this.querySelector('#spm-swap-dialog')?.close();
    this._swapPlan = null;
    this._swapMessage = '';
  }

  async _saveSwap(event) {
    event.preventDefault();
    if (this._busy || !this._swapPlan) return;
    this._busy = true;
    this._swapMessage = '';
    try {
      const plan = this._swapPlan;
      const payload = await postAction('/resource-plans/swap', {
        planSysId: plan.sys_id,
        assignedTo: this._swapAssignee,
        allocatedHours: Number(this._swapHours)
      });
      const result = payload.result?.result || payload.result || payload;
      const target = this._resources.find(item => item.assigned_to === this._swapAssignee);
      this._resources = this._resources.map(item => item.sys_id === plan.sys_id ? {
        ...item,
        assigned_to: result.assignedTo,
        assigned_to_display: target?.assigned_to_display || result.assignedTo,
        allocated_hours: result.allocatedHours,
        utilization: result.utilization
      } : item);
      this._announceWorkspace('resource-reassigned');
      this._closeSwap();
    } catch {
      this._swapMessage = i18n.getMessage('The server action could not update this resource plan. Check access and try again.');
    } finally {
      this._busy = false;
    }
  }

  async _askOtto(event) {
    const prompt = event.detail?.prompt || '';
    const executiveBrief = event.type === 'spm:brief-request';
    if (this._assistantSending) return;
    this._assistantSending = true;
    this._messages = [...this._messages, {role: 'user', text: executiveBrief ? i18n.getMessage('Generate Executive Brief') : prompt}];
    try {
      const payload = await postAction('/assist', {
        prompt,
        executiveBrief,
        context: {demands: this._demands, projects: this._projects, resources: this._resources}
      });
      const result = payload.result?.result || payload.result || payload;
      this._messages = [...this._messages, {role: 'assistant', text: result.text || i18n.getMessage('No response was returned.')}];
    } catch {
      this._messages = [...this._messages, {role: 'assistant', text: i18n.getMessage('The Now Assist mock endpoint is unavailable.')}];
    } finally {
      this._assistantSending = false;
    }
  }

  _submitPrompt(event) {
    event.preventDefault();
    const input = this.querySelector('#spm-assist-prompt');
    const prompt = input?.value.trim();
    if (!prompt || this._assistantSending) return;
    input.dispatchEvent(new CustomEvent('spm:assist-request', {detail: {prompt}, bubbles: true, composed: true}));
    input.value = '';
  }

  _renderDemandView() {
    const query = this._query.toLocaleLowerCase('en-US');
    const rows = this._demands.filter(record => `${record.number} ${record.short_description} ${record.state_display || record.state}`.toLocaleLowerCase('en-US').includes(query));
    const expectedReturn = this._demands.reduce((sum, record) => sum + amount(record.financial_return), 0);
    const score = this._demands.length ? Math.round(this._demands.reduce((sum, record) => sum + amount(record.score), 0) / this._demands.length) : 0;
    return html`
      <section class="spm-view" aria-labelledby="spm-demand-title">
        <div class="spm-view-heading"><div><p class="spm-eyebrow">${i18n.getMessage('Intake and prioritization')}</p><h2 id="spm-demand-title">${i18n.getMessage('Demand Triage')}</h2><p>${i18n.getMessage('Assess expected return, delivery risk, and readiness before committing capacity.')}</p></div><div class="spm-view-metric"><strong>${this._demands.length}</strong><span>${i18n.getMessage('in pipeline')}</span></div></div>
        <div class="spm-metric-strip"><div><span>${i18n.getMessage('Weighted score')}</span><strong>${score}</strong></div><div><span>${i18n.getMessage('Expected return')}</span><strong>${currency(expectedReturn)}</strong></div><div><span>${i18n.getMessage('High risk')}</span><strong>${this._demands.filter(item => riskOf(item) === 'High').length}</strong></div></div>
        <div class="spm-view-grid spm-demand-grid">
          <section class="spm-region" aria-labelledby="spm-pipeline-title">
            <div class="spm-region-heading"><div><p class="spm-eyebrow">${i18n.getMessage('Prioritization queue')}</p><h3 id="spm-pipeline-title">${i18n.getMessage('Demand pipeline')}</h3></div><label class="spm-search-label"><span class="sr-only">${i18n.getMessage('Filter demands')}</span><input class="aiux-input aiux-input-sm" type="search" placeholder=${i18n.getMessage('Search demands')} .value=${this._query} @input=${this._filterDemands}></label></div>
            <div class="spm-table-scroll"><table class="aiux-table aiux-table-zebra spm-data-table"><caption class="sr-only">${i18n.getMessage('Demand pipeline with scores, returns, risks, and conversion actions')}</caption>
              <thead><tr><th scope="col">${i18n.getMessage('Demand')}</th><th scope="col">${i18n.getMessage('Score')}</th><th scope="col">${i18n.getMessage('Financial return')}</th><th scope="col">${i18n.getMessage('Risk')}</th><th scope="col">${i18n.getMessage('State')}</th><th scope="col"><span class="sr-only">${i18n.getMessage('Actions')}</span></th></tr></thead>
              <tbody>${rows.length ? rows.map(record => {
                const risk = riskOf(record);
                const riskLabel = risk === 'High' ? i18n.getMessage('High') : risk === 'Medium' ? i18n.getMessage('Medium') : i18n.getMessage('Low');
                return html`<tr><td><span class="spm-record-number">${record.number || i18n.getMessage('Demand')}</span><strong>${record.short_description || i18n.getMessage('Untitled demand')}</strong></td><td class="spm-number-cell">${record.score || '0'}</td><td class="spm-number-cell">${currency(record.financial_return)}</td><td><span class="aiux-badge aiux-badge-soft aiux-badge-${riskTone(risk)}">${riskLabel}</span></td><td>${record.state_display || record.state || i18n.getMessage('Unspecified')}</td><td><button class="aiux-btn aiux-btn-primary aiux-btn-sm" type="button" data-id=${record.sys_id} @click=${this._emitConvert}>${i18n.getMessage('Convert')}</button></td></tr>`;
              }) : html`<tr><td colspan="6" class="spm-empty-cell">${i18n.getMessage('No demands match this search.')}</td></tr>`}</tbody>
            </table></div>
          </section>
          <section class="spm-region spm-matrix-region" aria-labelledby="spm-matrix-title"><div class="spm-region-heading"><div><p class="spm-eyebrow">${i18n.getMessage('Portfolio signal')}</p><h3 id="spm-matrix-title">${i18n.getMessage('Return vs. risk')}</h3></div></div><p class="spm-region-intro">${i18n.getMessage('Cell intensity represents the number of demands in each segment.')}</p>
            <aiux-visualizations-matrix type="heatmap" labels="values" .data=${roiRiskData(this._demands)} .matrix=${{xAxis: {column: 'roi', title: i18n.getMessage('Expected return')}, yAxis: {column: 'risk', title: i18n.getMessage('Risk')}, value: {column: 'demand_count'}}}></aiux-visualizations-matrix>
          </section>
        </div>
      </section>`;
  }

  _renderProjectView() {
    const attention = this._projects.filter(project => healthOf(project) === 'attention').length;
    return html`
      <section class="spm-view" aria-labelledby="spm-project-title">
        <div class="spm-view-heading"><div><p class="spm-eyebrow">${i18n.getMessage('Delivery oversight')}</p><h2 id="spm-project-title">${i18n.getMessage('Project Workspace')}</h2><p>${i18n.getMessage('Track execution health, milestones, and delivery blockers across the portfolio.')}</p></div><div class="spm-view-metric ${attention ? 'is-warning' : ''}"><strong>${attention}</strong><span>${i18n.getMessage('need attention')}</span></div></div>
        <section class="spm-region" aria-labelledby="spm-board-title"><div class="spm-region-heading"><div><p class="spm-eyebrow">${i18n.getMessage('Execution board')}</p><h3 id="spm-board-title">${i18n.getMessage('Project health')}</h3></div><div class="spm-board-legend"><span><i class="spm-legend-dot is-healthy"></i>${i18n.getMessage('Healthy')}</span><span><i class="spm-legend-dot is-risk"></i>${i18n.getMessage('At risk')}</span></div></div>
          <div class="spm-gantt-axis" aria-hidden="true"><span></span><span></span><div><span>${i18n.getMessage('Start')}</span><span>25%</span><span>50%</span><span>75%</span><span>${i18n.getMessage('End')}</span></div></div>
          <div class="spm-project-list">${this._projects.length ? this._projects.map(project => {
            const health = healthOf(project);
            const progress = Math.max(0, Math.min(100, amount(project.percent_complete)));
            const healthLabel = health === 'healthy' ? i18n.getMessage('Healthy') : i18n.getMessage('At risk');
            const timeline = projectTimeline(project, this._projects);
            return html`<article class="spm-project-row"><div class="spm-project-name"><span class="spm-record-number">${project.number || i18n.getMessage('Project')}</span><strong>${project.short_description || i18n.getMessage('Untitled project')}</strong><span>${project.top_portfolio_display || project.top_portfolio || i18n.getMessage('Portfolio not assigned')}</span></div><div class="spm-project-state"><span class="aiux-badge aiux-badge-soft aiux-badge-${health === 'healthy' ? 'success' : 'warning'}">${healthLabel}</span><span>${stateLabel(project)}</span></div><div class="spm-project-progress"><div class="spm-progress-label"><span>${i18n.getMessage('Timeline')}</span><strong>${progress}%</strong></div><div class="spm-gantt-track" role="meter" aria-label=${i18n.getMessage('Project timeline and percent complete')} aria-valuemin="0" aria-valuemax="100" aria-valuenow=${progress}><span class="spm-gantt-range" style=${`--offset:${timeline.offset}%;--range:${timeline.width}%;--progress:${timeline.progress}%`}></span></div><span class="spm-project-dates">${formatDate(project.start_date)} - ${formatDate(project.end_date)}</span></div></article>`;
          }) : html`<p class="spm-empty-state">${i18n.getMessage('No projects are available.')}</p>`}</div>
        </section>
        <section class="spm-region" aria-labelledby="spm-ridac-title"><div class="spm-region-heading"><div><p class="spm-eyebrow">${i18n.getMessage('Blocker review')}</p><h3 id="spm-ridac-title">${i18n.getMessage('RIDAC register')}</h3></div><span class="aiux-badge aiux-badge-error aiux-badge-soft">3 ${i18n.getMessage('active blockers')}</span></div><div class="spm-ridac-grid">
          ${[
            [i18n.getMessage('Risk'), i18n.getMessage('Vendor API readiness'), i18n.getMessage('High impact'), 'error'],
            [i18n.getMessage('Issue'), i18n.getMessage('Data mapping sign-off'), i18n.getMessage('Due this week'), 'warning'],
            [i18n.getMessage('Decision'), i18n.getMessage('Regional rollout sequence'), i18n.getMessage('Sponsor review'), 'info'],
            [i18n.getMessage('Action'), i18n.getMessage('Confirm test environment'), i18n.getMessage('In progress'), 'success'],
            [i18n.getMessage('Change'), i18n.getMessage('Scope adjustment request'), i18n.getMessage('Under review'), 'warning']
          ].map(([kind, title, status, tone]) => html`<article class="spm-ridac-item"><span class="spm-ridac-kind">${kind}</span><strong>${title}</strong><span class="aiux-badge aiux-badge-${tone} aiux-badge-soft">${status}</span></article>`)}
        </div></section>
      </section>`;
  }

  _renderResourceView() {
    const overallocated = this._resources.filter(item => amount(item.utilization) > 100).length;
    const average = this._resources.length ? Math.round(this._resources.reduce((sum, item) => sum + amount(item.utilization), 0) / this._resources.length) : 0;
    return html`
      <section class="spm-view" aria-labelledby="spm-resource-title">
        <div class="spm-view-heading"><div><p class="spm-eyebrow">${i18n.getMessage('People and allocation')}</p><h2 id="spm-resource-title">${i18n.getMessage('Resource Capacity')}</h2><p>${i18n.getMessage('Rebalance planned hours before utilization pressure becomes a delivery risk.')}</p></div><div class="spm-view-metric ${overallocated ? 'is-danger' : ''}"><strong>${overallocated}</strong><span>${i18n.getMessage('over capacity')}</span></div></div>
        <div class="spm-metric-strip"><div><span>${i18n.getMessage('Resource plans')}</span><strong>${this._resources.length}</strong></div><div><span>${i18n.getMessage('Average utilization')}</span><strong>${average}%</strong></div><div><span>${i18n.getMessage('Available below 80%')}</span><strong>${this._resources.filter(item => amount(item.utilization) < 80).length}</strong></div></div>
        <section class="spm-region" aria-labelledby="spm-allocation-title"><div class="spm-region-heading"><div><p class="spm-eyebrow">${i18n.getMessage('Live allocation grid')}</p><h3 id="spm-allocation-title">${i18n.getMessage('Resource plans')}</h3></div></div><div class="spm-table-scroll"><table class="aiux-table aiux-table-zebra spm-data-table spm-resource-table"><caption class="sr-only">${i18n.getMessage('Resource assignments and utilization levels')}</caption>
          <thead><tr><th scope="col">${i18n.getMessage('Resource')}</th><th scope="col">${i18n.getMessage('Assignment')}</th><th scope="col">${i18n.getMessage('Hours')}</th><th scope="col">${i18n.getMessage('Utilization')}</th><th scope="col">${i18n.getMessage('Availability')}</th><th scope="col"><span class="sr-only">${i18n.getMessage('Actions')}</span></th></tr></thead><tbody>
            ${this._resources.length ? this._resources.map(resource => {
              const utilization = Math.max(0, amount(resource.utilization));
              const tone = utilizationTone(utilization);
              const availability = utilization > 100 ? i18n.getMessage('Over capacity') : utilization >= 80 ? i18n.getMessage('Near capacity') : i18n.getMessage('Available');
              return html`<tr><td><span class="spm-record-number">${resource.number || i18n.getMessage('Resource plan')}</span><strong>${resource.assigned_to_display || i18n.getMessage('Unassigned')}</strong></td><td>${resource.short_description || resource.role || i18n.getMessage('Allocation')}</td><td class="spm-number-cell">${resource.allocated_hours || '0'}</td><td><span class="aiux-badge aiux-badge-${tone} aiux-badge-soft">${utilization}%</span></td><td><div class="spm-heat-track" aria-hidden="true"><span class="spm-heat-${tone}" style=${`--utilization:${Math.min(100, utilization)}%`}></span></div><span class="sr-only">${availability}</span></td><td><button class="aiux-btn aiux-btn-secondary aiux-btn-sm" type="button" data-id=${resource.sys_id} @click=${this._emitSwap}>${i18n.getMessage('Reassign')}</button></td></tr>`;
            }) : html`<tr><td colspan="6" class="spm-empty-cell">${i18n.getMessage('No resource plans are available.')}</td></tr>`}
          </tbody></table></div><div class="spm-capacity-legend"><span><i class="spm-legend-dot is-healthy"></i>${i18n.getMessage('Below 80%')}</span><span><i class="spm-legend-dot is-warning"></i>${i18n.getMessage('80% to 100%')}</span><span><i class="spm-legend-dot is-risk"></i>${i18n.getMessage('Above 100%')}</span></div></section>
      </section>`;
  }

  _renderAssistant() {
    return html`<aside class="spm-assistant" aria-labelledby="spm-assist-title"><header class="spm-assistant-head"><div><p class="spm-eyebrow">${i18n.getMessage('Now Assist')}</p><h2 id="spm-assist-title">${i18n.getMessage('Otto Copilot')}</h2></div><button class="aiux-btn aiux-btn-ghost aiux-btn-circle aiux-btn-sm" type="button" aria-label=${i18n.getMessage('Close assistant')} @click=${() => { this._assistantOpen = false; }}>×</button></header>
      <button class="aiux-btn aiux-btn-primary aiux-btn-sm spm-brief-button" type="button" ?disabled=${this._assistantSending} @click=${event => event.currentTarget.dispatchEvent(new CustomEvent('spm:brief-request', {detail: {}, bubbles: true, composed: true}))}>${i18n.getMessage('Generate Executive Brief')}</button><p class="spm-assistant-context">${i18n.getMessage('Context includes current demands, projects, and resource plans.')}</p>
      <div class="spm-chat-log" aria-live="polite" aria-relevant="additions text">${this._messages.length ? this._messages.map(message => html`<article class="spm-chat-message ${message.role === 'user' ? 'is-user' : 'is-assistant'}"><span class="spm-chat-author">${message.role === 'user' ? i18n.getMessage('You') : i18n.getMessage('Otto')}</span><div>${message.text.split('\n').map(line => line.startsWith('## ') ? html`<h3>${line.slice(3)}</h3>` : line.match(/^- \*\*(.+?)\*\*:\s*(.*)$/) ? html`<p><strong>${line.match(/^- \*\*(.+?)\*\*:/)[1]}</strong> ${line.match(/^- \*\*.+?\*\*:\s*(.*)$/)[1]}</p>` : line ? html`<p>${line}</p>` : nothing)}</div></article>`) : html`<div class="spm-assistant-empty"><span aria-hidden="true">✳</span><p>${i18n.getMessage('Ask about project blockers, demand priorities, or capacity pressure.')}</p></div>`}${this._assistantSending ? html`<p role="status" class="spm-assistant-pending">${i18n.getMessage('Preparing a contextual response')}</p>` : nothing}</div>
      <form class="spm-chat-form" aria-label=${i18n.getMessage('Otto Copilot prompt')} @submit=${this._submitPrompt}><label class="sr-only" for="spm-assist-prompt">${i18n.getMessage('Ask Otto a question')}</label><textarea id="spm-assist-prompt" class="aiux-textarea" rows="3" maxlength="1000" placeholder=${i18n.getMessage('Ask a question about this workspace')}></textarea><button class="aiux-btn aiux-btn-primary" type="submit" ?disabled=${this._assistantSending}>${this._assistantSending ? i18n.getMessage('Sending') : i18n.getMessage('Send question')}</button></form><p class="spm-assistant-disclaimer">${i18n.getMessage('Responses use a local mock endpoint and are not generated by Now Assist.')}</p></aside>`;
  }

  _renderConversionDialog() {
    const demand = this._conversionDemand;
    const steps = [i18n.getMessage('Select demand'), i18n.getMessage('Set portfolio'), i18n.getMessage('Create project')];
    const portfolios = Array.from(new Set(this._projects.map(project => project.top_portfolio).filter(Boolean)));
    return html`<dialog id="spm-convert-dialog" class="aiux-modal spm-dialog" aria-labelledby="spm-convert-title" @close=${() => { this._conversionDemand = null; }}><div class="aiux-modal-box spm-dialog-box"><div class="spm-dialog-head"><div><p class="spm-eyebrow">${i18n.getMessage('Demand conversion')}</p><h2 id="spm-convert-title">${i18n.getMessage('Convert to project')}</h2></div><button class="aiux-btn aiux-btn-ghost aiux-btn-circle aiux-btn-sm" type="button" aria-label=${i18n.getMessage('Close dialog')} @click=${this._closeConversion}>×</button></div>
      <ul class="aiux-steps aiux-steps-horizontal spm-steps" aria-label=${i18n.getMessage('Conversion progress')}>${steps.map((step, index) => html`<li class="aiux-step ${index < this._conversionStep ? 'aiux-step-success' : index === this._conversionStep ? 'aiux-step-primary' : 'aiux-step-neutral'}" data-content=${String(index + 1)} aria-current=${index === this._conversionStep ? 'step' : nothing}>${step}</li>`)}</ul>
      <div class="spm-dialog-content">${this._conversionStep === 0 ? html`<p>${i18n.getMessage('Review the selected demand before creating a project.')}</p><div class="spm-review-row"><span>${i18n.getMessage('Demand')}</span><strong>${demand.number} - ${demand.short_description}</strong></div><div class="spm-review-row"><span>${i18n.getMessage('Expected return')}</span><strong>${currency(demand.financial_return)}</strong></div>` : nothing}${this._conversionStep === 1 ? html`<label class="spm-field-label" for="spm-portfolio">${i18n.getMessage('Top portfolio')}</label><select id="spm-portfolio" class="aiux-select" .value=${this._conversionPortfolio} @change=${event => { this._conversionPortfolio = event.currentTarget.value; }}><option value="">${i18n.getMessage('Select a portfolio')}</option>${portfolios.map(portfolio => html`<option value=${portfolio}>${portfolio}</option>`)}</select><p class="spm-field-hint">${i18n.getMessage('You can adjust project phase and dates after conversion.')}</p>` : nothing}${this._conversionStep === 2 ? html`<p>${i18n.getMessage('A new project will be created and the demand will be marked converted.')}</p><div class="spm-review-row"><span>${i18n.getMessage('Project')}</span><strong>${demand.short_description}</strong></div><div class="spm-review-row"><span>${i18n.getMessage('Portfolio')}</span><strong>${this._conversionPortfolio || i18n.getMessage('Not assigned')}</strong></div>` : nothing}${this._conversionMessage ? html`<p class="spm-inline-message" role="status">${this._conversionMessage}</p>` : nothing}</div>
      <div class="spm-dialog-actions"><button class="aiux-btn aiux-btn-secondary" type="button" @click=${this._closeConversion}>${i18n.getMessage('Cancel')}</button>${this._conversionStep > 0 ? html`<button class="aiux-btn aiux-btn-secondary" type="button" @click=${() => { this._conversionStep -= 1; }}>${i18n.getMessage('Back')}</button>` : nothing}<button class="aiux-btn aiux-btn-primary" type="button" ?disabled=${this._busy} @click=${this._advanceConversion}>${this._busy ? i18n.getMessage('Working') : this._conversionStep === 2 ? i18n.getMessage('Create project') : i18n.getMessage('Continue')}</button></div></div></dialog>`;
  }

  _renderSwapDialog() {
    const assignees = Array.from(new Map(this._resources.filter(item => item.assigned_to).map(item => [item.assigned_to, item.assigned_to_display || item.assigned_to])), ([id, name]) => ({id, name}));
    return html`<dialog id="spm-swap-dialog" class="aiux-modal spm-dialog spm-drawer-dialog" aria-labelledby="spm-swap-title" @close=${() => { this._swapPlan = null; }}><div class="aiux-modal-box spm-dialog-box spm-drawer-box"><div class="spm-dialog-head"><div><p class="spm-eyebrow">${i18n.getMessage('Resource plan')}</p><h2 id="spm-swap-title">${i18n.getMessage('Reassign resource')}</h2></div><button class="aiux-btn aiux-btn-ghost aiux-btn-circle aiux-btn-sm" type="button" aria-label=${i18n.getMessage('Close drawer')} @click=${this._closeSwap}>×</button></div><form aria-label=${i18n.getMessage('Resource reassignment')} @submit=${this._saveSwap}><p class="spm-drawer-record">${this._swapPlan.short_description}</p><label class="spm-field-label" for="spm-assignee">${i18n.getMessage('Assign to')}</label><select id="spm-assignee" class="aiux-select" required .value=${this._swapAssignee} @change=${event => { this._swapAssignee = event.currentTarget.value; }}>${assignees.map(person => html`<option value=${person.id}>${person.name}</option>`)}</select><label class="spm-field-label" for="spm-hours">${i18n.getMessage('Allocated hours')}</label><input id="spm-hours" class="aiux-input" type="number" min="0" max="168" step="0.5" required .value=${this._swapHours} @input=${event => { this._swapHours = event.currentTarget.value; }} /><p class="spm-field-hint">${i18n.getMessage('Utilization is recalculated by the server action using a 40-hour work week.')}</p>${this._swapMessage ? html`<p class="spm-inline-message" role="alert">${this._swapMessage}</p>` : nothing}<div class="spm-dialog-actions"><button class="aiux-btn aiux-btn-secondary" type="button" @click=${this._closeSwap}>${i18n.getMessage('Cancel')}</button><button class="aiux-btn aiux-btn-primary" type="submit" ?disabled=${this._busy}>${this._busy ? i18n.getMessage('Saving') : i18n.getMessage('Save assignment')}</button></div></form></div></dialog>`;
  }

  render() {
    const dataLabel = this._dataMode === 'live' ? i18n.getMessage('Live data') : this._dataMode === 'connecting' ? i18n.getMessage('Connecting') : i18n.getMessage('Demo data');
    return html`<div class="spm-app" @spm:convert-demand=${this._beginConversion} @spm:resource-swap=${this._beginSwap} @spm:assist-request=${this._askOtto} @spm:brief-request=${this._askOtto}>
      <header class="spm-topbar"><div class="spm-brand-lockup"><span class="spm-brand-mark" aria-hidden="true">S</span><div><p class="spm-eyebrow">${i18n.getMessage('Portfolio operations')}</p><h1>${i18n.getMessage('SPM Unified Hub')}</h1></div></div><div class="spm-topbar-actions"><span class="aiux-badge aiux-badge-soft aiux-badge-${this._dataMode === 'live' ? 'success' : 'warning'}"><i class="spm-status-dot" aria-hidden="true"></i>${dataLabel}</span><button class="aiux-btn aiux-btn-secondary aiux-btn-sm" type="button" aria-expanded=${this._assistantOpen} @click=${() => { this._assistantOpen = !this._assistantOpen; }}>${this._assistantOpen ? i18n.getMessage('Close Otto Copilot') : i18n.getMessage('Open Otto Copilot')}</button></div></header>
      ${this._dataMode === 'demo' ? html`<div class="spm-demo-notice" role="status">${i18n.getMessage('Showing sample records because the workspace API is not connected.')}</div>` : nothing}
      <div class="spm-workspace-layout ${this._assistantOpen ? 'has-assistant' : ''}"><aside class="spm-sidebar" aria-label=${i18n.getMessage('Workspace navigation')}><p class="spm-sidebar-label">${i18n.getMessage('Workspaces')}</p><div role="tablist" aria-label=${i18n.getMessage('SPM workspace views')} aria-orientation="vertical" @keydown=${this._tabKeydown}>
        ${[['demand', '01', i18n.getMessage('Demand Triage'), this._demands.length], ['project', '02', i18n.getMessage('Project Workspace'), this._projects.length], ['resource', '03', i18n.getMessage('Resource Capacity'), this._resources.length]].map(([id, number, title, count]) => html`<button id=${`spm-tab-${id}`} class="spm-nav-tab ${this._activeView === id ? 'is-active' : ''}" role="tab" aria-selected=${this._activeView === id ? 'true' : 'false'} aria-controls="spm-view-panel" tabindex=${this._activeView === id ? '0' : '-1'} data-view=${id} type="button" @click=${this._chooseView}><span class="spm-nav-index">${number}</span><span>${title}</span><span class="spm-nav-count">${count}</span></button>`)}
      </div><div class="spm-sidebar-foot"><span class="spm-avatar" aria-hidden="true">SP</span><span>${i18n.getMessage('Strategic portfolio')}</span></div></aside>
      <div id="spm-view-panel" role="tabpanel" aria-labelledby=${`spm-tab-${this._activeView}`}><main class="spm-main">${this._activeView === 'demand' ? this._renderDemandView() : this._activeView === 'project' ? this._renderProjectView() : this._renderResourceView()}</main></div>
      ${this._assistantOpen ? this._renderAssistant() : nothing}</div>
      ${this._conversionDemand ? this._renderConversionDialog() : nothing}${this._swapPlan ? this._renderSwapDialog() : nothing}
    </div>`;
  }
}