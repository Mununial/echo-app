import React, { useCallback, useRef } from "react";
import ReactFlow, {
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel
} from "reactflow";
import "reactflow/dist/style.css";
import { toPng } from "html-to-image";
import { Download } from "lucide-react";

export default function MindMap({ nodes: initialNodes, edges: initialEdges }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges || []);
  const flowRef = useRef(null);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const downloadImage = () => {
    if (!flowRef.current) return;

    toPng(flowRef.current, {
      backgroundColor: "#0f172a",
      cacheBust: true
    }).then((dataUrl) => {
      const a = document.createElement("a");
      a.download = "knowledge-graph.png";
      a.href = dataUrl;
      a.click();
    });
  };

  if (!nodes || nodes.length === 0) {
    return (
      <div
        style={{
          height: "400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px dashed #444",
          borderRadius: "12px",
          color: "#888"
        }}
      >
        Mind Map will appear here...
      </div>
    );
  }

  return (
    <div
      ref={flowRef}
      style={{
        width: "100%",
        height: "600px",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "1rem",
        overflow: "hidden"
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        proOptions={{ hideAttribution: true }}

      >
        <Background color="#aaa" gap={16} />

        <Panel position="top-right">
          <button
            onClick={downloadImage}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              background: "#4f46e5",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            <Download size={16} />
            Download
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
