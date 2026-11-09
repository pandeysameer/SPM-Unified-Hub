import {RestApi} from '@servicenow/sdk/core';

const version = {
  $id: Now.ID['spm_hub_api_version_1'],
  version: 1,
  active: true,
  isDefault: true
};

RestApi({
  $id: Now.ID['spm_hub_workspace_api'],
  name: 'SPM Hub Workspace API',
  serviceId: 'spm_hub',
  active: true,
  consumes: 'application/json',
  produces: 'application/json',
  shortDescription: 'Server actions for SPM workspace data and workflows.',
  versions: [version],
  routes: [
    {
      $id: Now.ID['spm_hub_get_workspace'],
      version: 1,
      name: 'Get SPM workspace',
      method: 'GET',
      path: '/workspace',
      authentication: true,
      authorization: true,
      internalRole: false,
      script: `function process(request, response) {
        var result = {demands: [], projects: [], resources: []};
        var definitions = [
          {
            table: 'dmn_demand',
            key: 'demands',
            fields: [
              'number',
              'short_description',
              'state',
              'score',
              'financial_return',
              'risk'
            ]
          },
          {
            table: 'pm_project',
            key: 'projects',
            fields: [
              'number',
              'short_description',
              'top_portfolio',
              'phase',
              'percent_complete',
              'state',
              'start_date',
              'end_date'
            ]
          },
          {
            table: 'resource_plan',
            key: 'resources',
            fields: [
              'number',
              'short_description',
              'assigned_to',
              'allocated_hours',
              'utilization',
              'state',
              'role'
            ]
          }
        ];

        try {
          definitions.forEach(function (definition) {
            var record = new GlideRecordSecure(definition.table);
            record.setLimit(100);
            record.query();
            while (record.next()) {
              if (!record.canRead()) continue;
              var row = {sys_id: record.getUniqueValue()};
              definition.fields.forEach(function (field) {
                if (!record.isValidField(field)) return;
                row[field] = record.getValue(field);
                row[field + '_display'] = record.getDisplayValue(field);
              });
              result[definition.key].push(row);
            }
          });
          response.setStatus(200);
          response.setBody({result: result});
        } catch (error) {
          response.setStatus(500);
          response.setBody({error: String(error.message || error)});
        }
      }`,
    },
    {
      $id: Now.ID['spm_hub_convert_demand'],
      version: 1,
      name: 'Convert demand to project',
      method: 'POST',
      path: '/demands/convert',
      authentication: true,
      authorization: true,
      internalRole: false,
      script: `function process(request, response) {
        var payload = request.body && request.body.data || {};
        var demandId = String(payload.demandSysId || '');
        if (!/^[a-f0-9]{32}$/i.test(demandId)) {
          response.setStatus(400);
          response.setBody({error: 'A valid demand record is required.'});
          return;
        }

        var demand = new GlideRecordSecure('dmn_demand');
        if (!demand.get(demandId) || !demand.canRead() || !demand.canWrite()) {
          response.setStatus(404);
          response.setBody({error: 'The demand is unavailable or cannot be updated.'});
          return;
        }

        var convertedChoice = new GlideRecordSecure('sys_choice');
        convertedChoice.addQuery('name', 'dmn_demand');
        convertedChoice.addQuery('element', 'state');
        convertedChoice.addQuery('label', 'Converted');
        convertedChoice.addQuery('inactive', false);
        convertedChoice.setLimit(1);
        convertedChoice.query();
        if (!convertedChoice.next()) {
          response.setStatus(409);
          response.setBody({error: 'The Converted demand state is not configured.'});
          return;
        }

        var project = new GlideRecordSecure('pm_project');
        if (!project.canCreate()) {
          response.setStatus(403);
          response.setBody({error: 'You do not have permission to create projects.'});
          return;
        }
        project.initialize();
        project.setValue(
          'short_description',
          demand.getValue('short_description') || demand.getValue('number')
        );
        if (project.isValidField('description') && demand.isValidField('description')) {
          project.setValue('description', demand.getValue('description'));
        }
        if (payload.topPortfolio && project.isValidField('top_portfolio')) {
          project.setValue('top_portfolio', String(payload.topPortfolio));
        }
        if (project.isValidField('percent_complete')) {
          project.setValue('percent_complete', '0');
        }
        var projectId = project.insert();
        if (!projectId) {
          response.setStatus(500);
          response.setBody({error: 'The project could not be created.'});
          return;
        }

        demand.setValue('state', convertedChoice.getValue('value'));
        var demandUpdate = demand.update();
        if (!demandUpdate) {
          response.setStatus(500);
          response.setBody({error: 'The demand state could not be updated.'});
          return;
        }

        response.setStatus(201);
        response.setBody({result: {projectSysId: String(projectId), demandSysId: demandId}});
      }`,
    },
    {
      $id: Now.ID['spm_hub_swap_resource_plan'],
      version: 1,
      name: 'Reassign resource plan',
      method: 'POST',
      path: '/resource-plans/swap',
      authentication: true,
      authorization: true,
      internalRole: false,
      script: `function process(request, response) {
        var payload = request.body && request.body.data || {};
        var planId = String(payload.planSysId || '');
        var assigneeId = String(payload.assignedTo || '');
        var allocatedHours = Number(payload.allocatedHours);
        if (!/^[a-f0-9]{32}$/i.test(planId) || !/^[a-f0-9]{32}$/i.test(assigneeId)) {
          response.setStatus(400);
          response.setBody({error: 'A valid plan and assignee are required.'});
          return;
        }
        if (!isNaN(allocatedHours) && (allocatedHours < 0 || allocatedHours > 168)) {
          response.setStatus(400);
          response.setBody({error: 'Allocated hours must be between 0 and 168.'});
          return;
        }

        var user = new GlideRecordSecure('sys_user');
        if (!user.get(assigneeId) || !user.canRead() || user.getValue('active') !== 'true') {
          response.setStatus(404);
          response.setBody({error: 'The selected resource is unavailable.'});
          return;
        }
        var plan = new GlideRecordSecure('resource_plan');
        if (!plan.get(planId) || !plan.canRead() || !plan.canWrite()) {
          response.setStatus(404);
          response.setBody({error: 'The resource plan is unavailable or cannot be updated.'});
          return;
        }

        if (!isNaN(allocatedHours)) plan.setValue('allocated_hours', String(allocatedHours));
        plan.setValue('assigned_to', assigneeId);
        var totalHours = 0;
        var allocations = new GlideRecordSecure('resource_plan');
        allocations.addQuery('assigned_to', assigneeId);
        allocations.addQuery('sys_id', '!=', planId);
        allocations.setLimit(500);
        allocations.query();
        while (allocations.next()) {
          if (allocations.canRead()) {
            totalHours += Number(allocations.getValue('allocated_hours')) || 0;
          }
        }
        totalHours += Number(plan.getValue('allocated_hours')) || 0;
        if (plan.isValidField('utilization')) {
          plan.setValue('utilization', String(Math.round((totalHours / 40) * 100)));
        }
        var updatedId = plan.update();
        if (!updatedId) {
          response.setStatus(500);
          response.setBody({error: 'The resource plan could not be reassigned.'});
          return;
        }
        response.setStatus(200);
        response.setBody({
          result: {
            planSysId: String(updatedId),
            assignedTo: assigneeId,
            allocatedHours: plan.getValue('allocated_hours'),
            utilization: plan.getValue('utilization')
          }
        });
      }`,
    },
    {
      $id: Now.ID['spm_hub_assist'],
      version: 1,
      name: 'Generate contextual SPM response',
      method: 'POST',
      path: '/assist',
      authentication: true,
      authorization: true,
      internalRole: false,
      script: `function process(request, response) {
        var payload = request.body && request.body.data || {};
        var context = payload.context || {};
        var prompt = String(payload.prompt || '').slice(0, 1000);
        var demands = context.demands || [];
        var projects = context.projects || [];
        var resources = context.resources || [];
        var overallocated = resources.filter(function (resource) {
          return Number(resource.utilization) > 100;
        }).length;
        var atRisk = projects.filter(function (project) {
          return String(project.state).toLowerCase().indexOf('on track') < 0;
        }).length;
        var answer = payload.executiveBrief
          ? '## Executive brief\\n\\n' +
            '- **Demand pipeline:** ' + demands.length + ' active demands.\\n' +
            '- **Project delivery:** ' + projects.length + ' projects, ' + atRisk + ' requiring attention.\\n' +
            '- **Resource capacity:** ' + resources.length + ' plans, ' + overallocated + ' over 100% utilization.\\n\\n' +
            'Prioritize demand decisions that unblock at-risk delivery and rebalance overloaded resources.'
          : 'Context loaded: ' + demands.length + ' demands, ' + projects.length +
            ' projects, and ' + resources.length + ' resource plans. ' +
            (prompt ? 'For "' + prompt + '", ' : '') +
            (overallocated
              ? overallocated + ' resource plans exceed 100% utilization.'
              : 'no resource plans exceed 100% utilization.') +
            ' This response is generated by the local Now Assist mock endpoint.';
        response.setStatus(200);
        response.setBody({result: {text: answer, mock: true}});
      }`,
    }
  ]
});