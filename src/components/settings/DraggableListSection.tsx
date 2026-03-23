import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { GripVertical, Pencil, Trash2, Check, X, Plus } from "lucide-react";


interface Props { title: string; items: string[]; onItemsChange: (items: string[]) => void; addButtonText: string; }

export function DraggableListSection({ title, items, onItemsChange, addButtonText }: Props) {
  const G = "#C8A97E", G_D = "#8B6914", WHITE = "#FFFFFF", CREAM = "#FAFAF8"; const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E"; const GOLD = "#C8A97E", GOLD_DARK = "#8B6914", GOLD_LIGHT = "#FDF6E3";
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const arr = Array.from(items);
    const [removed] = arr.splice(result.source.index, 1);
    arr.splice(result.destination.index, 0, removed);
    onItemsChange(arr);
  };

  const startEdit = (i: number) => { setEditingIndex(i); setEditValue(items[i]); };
  const saveEdit = () => { if (editingIndex !== null && editValue.trim()) { const a = [...items]; a[editingIndex] = editValue.trim(); onItemsChange(a); } setEditingIndex(null); setEditValue(""); };
  const cancelEdit = () => { setEditingIndex(null); setEditValue(""); };
  const addItem = () => { onItemsChange([...items, ""]); setEditingIndex(items.length); setEditValue(""); };
  const removeItem = (i: number) => onItemsChange(items.filter((_, idx) => idx !== i));

  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "16px", overflow: "hidden", boxShadow: SHADOW }}>
      <div style={{ background: "linear-gradient(135deg,rgba(200,169,126,0.1),rgba(200,169,126,0.04))", padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 700, color: TXT, margin: 0 }}>{title}</h2>
        <button onClick={addItem} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "8px", background: G_D, color: WHITE, border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
          <Plus style={{ width: "12px", height: "12px" }} />{addButtonText}
        </button>
      </div>
      <div style={{ padding: "16px" }}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId={title.toLowerCase().replace(/\s/g, "-")}>
            {provided => (
              <div {...provided.droppableProps} ref={provided.innerRef} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {items.map((item, i) => (
                  <Draggable key={`${title}-${i}`} draggableId={`${title}-${i}`} index={i}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps}
                        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "10px", background: snapshot.isDragging ? "#FBF6EE" : CREAM, border: `1px solid ${snapshot.isDragging ? G : BORDER}`, ...provided.draggableProps.style }}>
                        <div {...provided.dragHandleProps} style={{ cursor: "grab", color: TXT_SOFT }}>
                          <GripVertical style={{ width: "14px", height: "14px" }} />
                        </div>
                        {editingIndex === i ? (
                          <>
                            <input value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus style={inp}
                              onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }} />
                            <button onClick={saveEdit} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}><Check style={{ width: "14px", height: "14px", color: "#16A34A" }} /></button>
                            <button onClick={cancelEdit} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}><X style={{ width: "14px", height: "14px", color: "#DC2626" }} /></button>
                          </>
                        ) : (
                          <>
                            <span style={{ flex: 1, fontSize: "13px", color: TXT, fontWeight: 500 }}>{item || "(empty)"}</span>
                            <button onClick={() => startEdit(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: TXT_MID }}><Pencil style={{ width: "13px", height: "13px" }} /></button>
                            <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#DC2626" }}><Trash2 style={{ width: "13px", height: "13px" }} /></button>
                          </>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}
