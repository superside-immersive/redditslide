// React Flow App - User Journey Flowchart
// Uses React.createElement (no JSX) for CDN compatibility
// Compatible with reactflow v11 UMD build

(function() {
    'use strict';

    // Journey steps - structured as user experience flow
    const JOURNEY_NODES = [
        { id: 'core-app', label: 'Customize Your Snoo', subtitle: 'Mobile Web Experience', color: '#FF4500', type: 'start', x: 420, y: 0 },
        { id: 'tablet-studio', label: 'Record Your Dance', subtitle: 'iPad Booth', color: '#00D4AA', type: 'main', x: 180, y: 160 },
        { id: 'view-dance', label: 'View on Mobile', subtitle: 'Watch & share your dance', color: '#FF6B35', type: 'main', x: 180, y: 320 },
        { id: 'big-stage', label: 'See It Big', subtitle: 'Cast to the large screen', color: '#F59E0B', type: 'optional', x: 420, y: 250 },
        { id: 'ar-extensions', label: 'AR Effects', subtitle: 'Choose your AR experience', color: '#7B68EE', type: 'branch', x: 730, y: 160 },
        // AR sub-nodes
        { id: 'ar-filters', label: 'Face Filters', subtitle: 'Fun Snoo face effects', color: '#E879F9', type: 'sub', x: 550, y: 340 },
        { id: 'ar-placement', label: '3D Placement', subtitle: 'Place Snoo in real space', color: '#818CF8', type: 'sub', x: 730, y: 340 },
        { id: 'ar-merch', label: 'AR Merch', subtitle: 'Customizable branded items', color: '#34D399', type: 'sub', x: 910, y: 340 },
        // Venue nodes
        { id: 'passive-connect', label: 'Scan and Discover', subtitle: 'QR codes • Collect surprise rewards', color: '#3B82F6', type: 'branch', x: 260, y: 500 },
        { id: 'pro-sync', label: 'Play Together', subtitle: 'Mini-games • Live infographics', color: '#2563EB', type: 'branch', x: 580, y: 500 }
    ];

    // Edge definitions
    const JOURNEY_EDGES = [
        { source: 'core-app', target: 'tablet-studio', label: 'Go to booth' },
        { source: 'tablet-studio', target: 'view-dance', label: '' },
        { source: 'tablet-studio', target: 'big-stage', label: 'optional', dashed: true },
        { source: 'core-app', target: 'ar-extensions', label: 'or try' },
        // AR sub-connections
        { source: 'ar-extensions', target: 'ar-filters', label: '' },
        { source: 'ar-extensions', target: 'ar-placement', label: '' },
        { source: 'ar-extensions', target: 'ar-merch', label: '' },
        // Venue connections
        { source: 'core-app', target: 'passive-connect', label: 'or scan' },
        { source: 'core-app', target: 'pro-sync', label: 'or play' }
    ];

    // Filter categories (elegant pills, no emojis)
    const FILTERS = [
        { id: 'ar-features', label: 'AR Effects', nodes: ['ar-extensions', 'ar-filters', 'ar-placement', 'ar-merch'], color: '#7B68EE' },
        { id: 'scan-discover', label: 'Scan & Discover', nodes: ['passive-connect'], color: '#3B82F6' },
        { id: 'play-together', label: 'Play Together', nodes: ['pro-sync'], color: '#2563EB' },
        { id: 'tablet-studio', label: 'Record Your Dance', nodes: ['tablet-studio', 'view-dance'], color: '#00D4AA' },
        { id: 'big-screen', label: 'See It Big', nodes: ['big-stage'], color: '#F59E0B' }
    ];

    function waitForLibraries(callback) {
        const check = setInterval(() => {
            if (typeof React !== 'undefined' && typeof ReactDOM !== 'undefined' && typeof ReactFlow !== 'undefined') {
                clearInterval(check);
                callback();
            }
        }, 100);
    }

    waitForLibraries(function() {
        const { useState, useCallback, useEffect, useMemo } = React;
        const RF = ReactFlow;

        function JourneyNode({ data }) {
            const isStart = data.type === 'start';
            const isOptional = data.type === 'optional';
            const isSub = data.type === 'sub';
            
            const style = {
                padding: isSub ? '10px 14px' : '14px 20px',
                borderRadius: isStart ? '24px' : '12px',
                background: isStart ? data.color : (data.color + '20'),
                border: '2px ' + (isOptional ? 'dashed' : 'solid') + ' ' + data.color,
                color: '#fff',
                minWidth: isSub ? '140px' : '160px',
                textAlign: 'center',
                boxShadow: 'none'
            };

            return React.createElement('div', { style: style },
                React.createElement(RF.Handle, { type: 'target', position: RF.Position.Top, style: { background: data.color, width: 8, height: 8, border: 'none' } }),
                React.createElement('div', { style: { fontWeight: isStart ? '700' : '600', fontSize: isSub ? '12px' : '14px', marginBottom: '4px' } }, data.label),
                React.createElement('div', { style: { fontSize: isSub ? '9px' : '10px', opacity: 0.85, lineHeight: '1.3' } }, data.subtitle),
                React.createElement(RF.Handle, { type: 'source', position: RF.Position.Bottom, style: { background: data.color, width: 8, height: 8, border: 'none' } })
            );
        }

        const nodeTypes = { journeyNode: JourneyNode };

        function FlowChart({ visibleNodes, focusNodeIds }) {
            const { nodes, edges } = useMemo(() => {
                const filteredNodes = JOURNEY_NODES.filter(n => visibleNodes.has(n.id)).map(n => ({
                    id: n.id,
                    type: 'journeyNode',
                    position: { x: n.x - 80, y: n.y },
                    data: { label: n.label, subtitle: n.subtitle, color: n.color, type: n.type }
                }));

                const filteredEdges = JOURNEY_EDGES.filter(e => visibleNodes.has(e.source) && visibleNodes.has(e.target)).map(e => ({
                    id: 'e-' + e.source + '-' + e.target,
                    source: e.source,
                    target: e.target,
                    animated: !e.dashed,
                    style: { stroke: JOURNEY_NODES.find(n => n.id === e.target)?.color || '#666', strokeWidth: 2, strokeDasharray: e.dashed ? '5,5' : 'none' },
                    label: e.label,
                    labelStyle: { fontSize: 10, fill: '#8a9a92' },
                    labelBgStyle: { fill: '#1a2e28', fillOpacity: 0.9 }
                }));

                return { nodes: filteredNodes, edges: filteredEdges };
            }, [visibleNodes]);

            const [nodesState, setNodes, onNodesChange] = RF.useNodesState(nodes);
            const [edgesState, setEdges, onEdgesChange] = RF.useEdgesState(edges);
            const { fitView } = RF.useReactFlow();

            useEffect(() => {
                setNodes(nodes);
                setEdges(edges);
            }, [nodes, edges, setNodes, setEdges]);

            // Smooth focus on selected nodes
            useEffect(() => {
                if (focusNodeIds && focusNodeIds.length > 0) {
                    setTimeout(() => {
                        fitView({
                            padding: 0.5,
                            duration: 800,
                            nodes: focusNodeIds.map(id => ({ id: id }))
                        });
                    }, 100);
                }
            }, [focusNodeIds, fitView]);

            return React.createElement(RF.ReactFlow, {
                nodes: nodesState,
                edges: edgesState,
                onNodesChange: onNodesChange,
                onEdgesChange: onEdgesChange,
                nodeTypes: nodeTypes,
                fitView: true,
                fitViewOptions: { padding: 0.3, duration: 800 },
                proOptions: { hideAttribution: true },
                style: { background: 'transparent' },
                nodesDraggable: false,
                nodesConnectable: false,
                elementsSelectable: false,
                panOnDrag: true,
                zoomOnScroll: true,
                zoomOnPinch: true,
                zoomOnDoubleClick: true,
                minZoom: 0.5,
                maxZoom: 2
            },
                React.createElement(RF.Background, { color: '#2a4a3a', gap: 24, variant: 'dots', size: 1 })
            );
        }

        function FlowchartApp() {
            const [activeFilters, setActiveFilters] = useState(new Set());
            const [focusNodeIds, setFocusNodeIds] = useState(null);

            const visibleNodes = useMemo(() => {
                const visible = new Set();
                FILTERS.forEach(f => {
                    if (activeFilters.has(f.id)) f.nodes.forEach(n => visible.add(n));
                });
                visible.add('core-app');
                return visible;
            }, [activeFilters]);

            const toggleFilter = useCallback((filterId) => {
                const parentMap = {
                    'tablet-studio': 'core-app',
                    'view-dance': 'tablet-studio',
                    'big-stage': 'tablet-studio',
                    'ar-extensions': 'core-app',
                    'passive-connect': 'core-app',
                    'pro-sync': 'core-app'
                };

                setActiveFilters(prev => {
                    const next = new Set(prev);
                    const willDisable = next.has(filterId);
                    if (willDisable) next.delete(filterId);
                    else next.add(filterId);

                    const filter = FILTERS.find(f => f.id === filterId);
                    if (filter && filter.nodes.length > 0) {
                        if (willDisable) {
                            const parent = parentMap[filter.nodes[0]] || 'core-app';
                            setFocusNodeIds([parent]);
                        } else {
                            setFocusNodeIds(filter.nodes);
                        }
                    }

                    return next;
                });
            }, []);

            const handleClick = useCallback((e) => e.stopPropagation(), []);

            const filterButtons = FILTERS.map(filter => {
                const isActive = activeFilters.has(filter.id);
                
                return React.createElement('button', {
                    key: filter.id,
                    onClick: () => toggleFilter(filter.id),
                    disabled: false,
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 18px',
                        borderRadius: '25px',
                        border: isActive ? 'none' : '1px solid rgba(216, 255, 133, 0.2)',
                        background: isActive ? filter.color : 'rgba(216, 255, 133, 0.05)',
                        color: isActive ? '#1a2e28' : 'rgba(247, 249, 242, 0.6)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        transition: 'all 0.25s ease',
                        boxShadow: isActive ? ('0 4px 15px ' + filter.color + '44') : 'none',
                        transform: isActive ? 'scale(1)' : 'scale(0.95)'
                    }
                },
                    React.createElement('span', null, filter.label)
                );
            });

            return React.createElement('div', {
                style: { display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', padding: '8px 0' },
                onClick: handleClick
            },
                React.createElement('div', { style: { textAlign: 'center', marginBottom: '4px' } },
                    React.createElement('p', { style: { fontSize: '13px', color: 'rgba(216, 255, 133, 0.6)', margin: 0, fontFamily: 'Inter Tight, sans-serif' } }, 'Toggle features to customize the experience')
                ),
                React.createElement('div', {
                    style: { display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', padding: '8px 0 16px 0', borderBottom: '1px solid rgba(216, 255, 133, 0.15)' }
                }, filterButtons),
                React.createElement('div', {
                    style: { flex: 1, minHeight: '320px', borderRadius: '16px', overflow: 'hidden', background: 'linear-gradient(180deg, rgba(216, 255, 133, 0.03) 0%, rgba(0,0,0,0) 100%)' }
                },
                    React.createElement(RF.ReactFlowProvider, null,
                        React.createElement(FlowChart, { visibleNodes: visibleNodes, focusNodeIds: focusNodeIds })
                    )
                )
            );
        }

        const root = document.getElementById('flowchart-root');
        if (root) {
            const togglesEl = document.getElementById('flowchart-toggles');
            if (togglesEl) togglesEl.style.display = 'none';
            root.style.height = '100%';
            root.style.minHeight = '480px';
            root.style.background = 'transparent';
            ReactDOM.render(React.createElement(FlowchartApp), root);
        }

        // Also mount in sidebar if present
        const sidebarRoot = document.getElementById('sidebar-flowchart-root');
        if (sidebarRoot) {
            const sidebarToggles = document.getElementById('sidebar-toggles');
            if (sidebarToggles) sidebarToggles.style.display = 'none';
            sidebarRoot.style.height = '100%';
            sidebarRoot.style.background = 'transparent';
            ReactDOM.render(React.createElement(FlowchartApp), sidebarRoot);
        }
    });
})();