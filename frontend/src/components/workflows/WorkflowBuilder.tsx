import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  Connection,
  Node,
  NodeTypes,
  useEdgesState,
  useNodesState,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuid } from 'uuid';
import {
  Box,
  Button,
  Stack,
  Typography,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { workflowService } from '../../services/workflowService';
import { Workflow, WorkflowExecutionResult } from '../../types/workflow.types';

// Node types data
type RFNodeData = {
  label: string;
  type: 'trigger' | 'condition' | 'action';
  config?: Record<string, any>;
};

// Custom Node Component
const BaseNode = ({ data, selected }: { data: RFNodeData; selected: boolean }) => {
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'trigger':
        return '#4CAF50';
      case 'condition':
        return '#FF9800';
      case 'action':
        return '#2196F3';
      default:
        return '#757575';
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        border: `2px solid ${selected ? '#1976d2' : getNodeColor(data.type)}`,
        borderRadius: 2,
        background: '#fff',
        width: 220,
        boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
      }}
    >
      <Typography
        variant="caption"
        component="div"
        sx={{
          color: getNodeColor(data.type),
          fontWeight: 'bold',
          textTransform: 'uppercase',
          mb: 0.5,
        }}
      >
        {data.type}
      </Typography>
      <Typography variant="body2" component="div" sx={{ fontWeight: 500 }}>
        {data.label}
      </Typography>
      {data.config && Object.keys(data.config).length > 0 && (
        <Chip
          size="small"
          icon={<SettingsIcon fontSize="small" />}
          label="Configured"
          sx={{ mt: 1, fontSize: '0.7rem' }}
        />
      )}
    </Box>
  );
};

const nodeTypes: NodeTypes = { base: BaseNode };

// Node templates
const nodeTemplates = [
  {
    type: 'trigger',
    templates: [
      { label: 'Opportunity Created', config: { triggerType: 'opportunity_created' } },
      { label: 'Lead Created', config: { triggerType: 'lead_created' } },
      { label: 'Account Created', config: { triggerType: 'account_created' } },
      { label: 'Campaign Started', config: { triggerType: 'campaign_started' } },
    ],
  },
  {
    type: 'condition',
    templates: [
      { label: 'Amount > Threshold', config: { field: 'amount', operator: 'greater_than', value: 10000 } },
      { label: 'Status Equals', config: { field: 'status', operator: 'equals', value: 'active' } },
      { label: 'Contains Text', config: { field: 'description', operator: 'contains', value: 'important' } },
    ],
  },
  {
    type: 'action',
    templates: [
      { label: 'Send Webhook', config: { actionType: 'webhook', url: 'https://example.com/webhook' } },
      { label: 'Send Email', config: { actionType: 'email', recipient: 'admin@example.com' } },
      { label: 'Create Task', config: { actionType: 'create_task', title: 'Follow up required' } },
      { label: 'Update Field', config: { actionType: 'update_field', field: 'priority', value: 'high' } },
    ],
  },
];

interface WorkflowBuilderProps {
  workflowId?: string;
  onSave?: (workflow: Workflow) => void;
}

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({ workflowId, onSave }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [testPayload, setTestPayload] = useState('{"amount": 15000, "status": "active", "description": "important deal"}');
  const [executionResult, setExecutionResult] = useState<WorkflowExecutionResult | null>(null);
  const [executing, setExecuting] = useState(false);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection, type: 'default', animated: false }, eds));
  }, [setEdges]);

  const addNode = useCallback((template: any, type: RFNodeData['type']) => {
    const id = uuid();
    const pos = { 
      x: 100 + nodes.length * 50, 
      y: 100 + (nodes.length % 3) * 100 
    };
    
    setNodes((ns) => ns.concat({
      id,
      type: 'base',
      data: { 
        label: template.label, 
        type,
        config: template.config 
      },
      position: pos
    } as Node<RFNodeData>));
  }, [nodes, setNodes]);

  const saveWorkflow = async () => {
    setSaving(true);
    try {
      const payload = {
        name: workflowName,
        description: workflowDescription,
        isActive: true,
        graph: { nodes, edges },
      };

      let savedWorkflow;
      if (currentWorkflow) {
        savedWorkflow = await workflowService.updateWorkflow(currentWorkflow.id, payload);
      } else {
        savedWorkflow = await workflowService.createWorkflow(payload);
      }

      setCurrentWorkflow(savedWorkflow);
      setSaveDialogOpen(false);
      
      if (onSave) {
        onSave(savedWorkflow);
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
    } finally {
      setSaving(false);
    }
  };

  const testWorkflow = async () => {
    if (!currentWorkflow) {
      alert('Please save the workflow first');
      return;
    }

    setExecuting(true);
    try {
      const payload = JSON.parse(testPayload);
      const result = await workflowService.executeWorkflow(currentWorkflow.id, { payload });
      setExecutionResult(result);
    } catch (error) {
      console.error('Error executing workflow:', error);
      setExecutionResult({
        success: false,
        logs: ['Error executing workflow'],
        executionTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setExecuting(false);
    }
  };

  const openSaveDialog = () => {
    if (!workflowName && currentWorkflow) {
      setWorkflowName(currentWorkflow.name);
      setWorkflowDescription(currentWorkflow.description || '');
    } else if (!workflowName) {
      setWorkflowName('My Workflow');
    }
    setSaveDialogOpen(true);
  };

  const openTestDialog = () => {
    setExecutionResult(null);
    setTestDialogOpen(true);
  };

  useEffect(() => {
    if (workflowId) {
      setLoading(true);
      workflowService.getWorkflow(workflowId)
        .then((workflow) => {
          setCurrentWorkflow(workflow);
          setWorkflowName(workflow.name);
          setWorkflowDescription(workflow.description || '');
          
          const graph = workflow.graph || { nodes: [], edges: [] };
          setNodes((graph.nodes || []).map((n: any) => ({ ...n, type: 'base' })));
          setEdges(graph.edges || []);
        })
        .catch((error) => {
          console.error('Error loading workflow:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [workflowId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', gap: 2 }}>
      {/* Node Palette */}
      <Paper sx={{ width: 300, p: 2, overflowY: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Workflow Palette
        </Typography>
        
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Button variant="contained" onClick={openSaveDialog} startIcon={<SaveIcon />}>
            {currentWorkflow ? 'Update Workflow' : 'Save Workflow'}
          </Button>
          <Button variant="outlined" onClick={openTestDialog} startIcon={<PlayArrowIcon />}>
            Test Workflow
          </Button>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {nodeTemplates.map((category) => (
          <Box key={category.type} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, textTransform: 'capitalize', fontWeight: 'bold' }}>
              {category.type}s
            </Typography>
            <Stack spacing={1}>
              {category.templates.map((template, index) => (
                <Button
                  key={index}
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => addNode(template, category.type as RFNodeData['type'])}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  {template.label}
                </Button>
              ))}
            </Stack>
          </Box>
        ))}

        {currentWorkflow && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Workflow Info
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Name:</strong> {currentWorkflow.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Status:</strong> {currentWorkflow.status}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Version:</strong> {currentWorkflow.version}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Flow Canvas */}
      <Box sx={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          nodeTypes={nodeTypes}
          defaultEdgeOptions={{
            animated: true,
            style: { strokeWidth: 2 },
          }}
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </Box>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentWorkflow ? 'Update Workflow' : 'Save Workflow'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Workflow Name"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={workflowDescription}
              onChange={(e) => setWorkflowDescription(e.target.value)}
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={saveWorkflow} 
            variant="contained" 
            disabled={saving || !workflowName.trim()}
          >
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Test Workflow</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Test Payload (JSON)"
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              multiline
              rows={4}
              helperText="Enter a JSON object to test your workflow"
            />
            
            {executionResult && (
              <Box>
                <Alert severity={executionResult.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                  Execution {executionResult.success ? 'Successful' : 'Failed'} 
                  ({executionResult.executionTime}ms)
                </Alert>
                
                <Typography variant="subtitle2" gutterBottom>
                  Execution Logs:
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 200, overflowY: 'auto' }}>
                  {executionResult.logs.map((log, index) => (
                    <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {log}
                    </Typography>
                  ))}
                </Paper>
                
                {executionResult.error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    Error: {executionResult.error}
                  </Alert>
                )}
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Close</Button>
          <Button 
            onClick={testWorkflow} 
            variant="contained" 
            disabled={executing || !currentWorkflow}
            startIcon={executing ? <CircularProgress size={16} /> : <PlayArrowIcon />}
          >
            {executing ? 'Executing...' : 'Run Test'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Wrapper component with ReactFlowProvider
const WorkflowBuilderWrapper: React.FC<WorkflowBuilderProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowBuilder {...props} />
    </ReactFlowProvider>
  );
};

export default WorkflowBuilderWrapper;