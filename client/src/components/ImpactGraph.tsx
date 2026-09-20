import { useMemo } from 'react';
import ReactFlow, { Background, BackgroundVariant, Handle, Position, type Edge, type Node, type NodeProps } from 'reactflow';
import 'reactflow/dist/style.css';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import type { ImpactRadius } from '@/types';

interface NodeData { label: string; kind: 'approval' | 'activity'; milestone: boolean; critical: boolean; depth: number; status: string }

function ImpactNodeCard({ data }: NodeProps<NodeData>) {
  const isApproval = data.kind === 'approval';
  return (
    <div className={cn(
      'min-w-[190px] max-w-[230px] rounded-xl border px-4 py-3 text-left shadow-card',
      isApproval ? 'border-bad/45 bg-surface' : 'border-line-strong bg-surface',
    )}>
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-line-strong" />
      <p className={cn('text-cap font-medium', isApproval ? 'text-bad' : 'text-fg2')}>
        {isApproval ? 'Pending decision' : data.milestone ? 'Milestone' : 'Activity'}
      </p>
      <p className="mt-0.5 text-foot font-medium leading-snug text-fg">{data.label}</p>
      <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-line-strong" />
    </div>
  );
}

const nodeTypes = { impact: ImpactNodeCard };

const palette = {
  light: { bad: '#C7202D', path: '#0064D2', dots: '#D4D4DA' },
  dark: { bad: '#FF6C64', path: '#60AAFF', dots: '#3C3C40' },
};

export function ImpactGraph({ impact, approvalName }: { impact: ImpactRadius; approvalName: string }) {
  const { resolved } = useTheme();
  const c = palette[resolved];

  const { nodes, edges } = useMemo(() => {
    const byDepth = new Map<number, string[]>();
    impact.activities.forEach((a) => byDepth.set(a.depth, [...(byDepth.get(a.depth) ?? []), a.key]));

    const nodes: Node<NodeData>[] = [
      { id: '__approval', type: 'impact', position: { x: 0, y: 120 }, data: { label: approvalName, kind: 'approval', milestone: false, critical: true, depth: -1, status: 'SLA_BREACHED' }, draggable: false },
      ...impact.activities.map((a) => {
        const peers = byDepth.get(a.depth) ?? [];
        const index = peers.indexOf(a.key);
        return {
          id: a.key, type: 'impact',
          position: { x: 270 + a.depth * 260, y: 120 + (index - (peers.length - 1) / 2) * 100 },
          data: { label: a.name, kind: 'activity' as const, milestone: a.isMilestone, critical: a.isCritical, depth: a.depth, status: a.status },
          draggable: false,
        };
      }),
    ];

    const edges: Edge[] = [
      ...impact.directActivities.map((key) => ({
        id: `e-approval-${key}`, source: '__approval', target: key, style: { stroke: c.bad, strokeWidth: 1.6 },
      })),
      ...impact.path.map((p) => ({
        id: `e-${p.from}-${p.to}`, source: p.from, target: p.to, style: { stroke: c.path, strokeWidth: 1.3, opacity: 0.6 },
      })),
    ];
    return { nodes, edges };
  }, [impact, approvalName, c]);

  // A long chain fitted to the width becomes unreadable. Past a few steps, keep a legible zoom
  // and let the viewer drag along the path instead.
  const maxDepth = impact.activities.reduce((m, a) => Math.max(m, a.depth), 0);
  const long = maxDepth > 3;

  return (
    <div>
      <div role="img" aria-label={`Dependency graph: ${impact.counts.activities} activities depend on ${approvalName}`}
        className="h-[300px] w-full overflow-hidden rounded-card border border-line bg-subtle sm:h-[340px]">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
          {...(long
            ? { defaultViewport: { x: 24, y: 64, zoom: 0.85 } }
            : { fitView: true, fitViewOptions: { padding: 0.16, maxZoom: 1 } })}
          proOptions={{ hideAttribution: true }} nodesConnectable={false} elementsSelectable={false}
          preventScrolling={false} zoomOnScroll={false} minZoom={0.3} maxZoom={1.4}>
          <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color={c.dots} />
        </ReactFlow>
      </div>
      {long && <p className="mt-3 text-foot text-fg2">Drag the graph to follow the path to the end.</p>}
    </div>
  );
}
