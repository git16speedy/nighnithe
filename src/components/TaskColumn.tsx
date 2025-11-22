"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, GripVertical } from "lucide-react";
import TaskCard from './TaskCard';
import { Droppable } from 'react-beautiful-dnd';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from '@/integrations/supabase/types'; // Import Tables

type TaskColumn = Tables<'task_columns'>;
type Task = Tables<'tasks'>;

interface TaskColumnProps {
  column: TaskColumn;
  tasks: Task[];
  onAddTask: (columnId: string, title: string) => void;
  onUpdateTask: (updatedTask: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onDuplicateTask: (taskToDuplicate: Task) => void;
  onUpdateColumn: (updatedColumn: TaskColumn) => void;
  onDeleteColumn: (columnId: string) => void;
  storeId: string;
}

export default function TaskColumn({
  column,
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
  onUpdateColumn,
  onDeleteColumn,
  storeId,
}: TaskColumnProps) {
  const { toast } = useToast();
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showEditColumnDialog, setShowEditColumnDialog] = useState(false);
  const [editColumnName, setEditColumnName] = useState(column.name);

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onAddTask(column.id, newTaskTitle);
      setNewTaskTitle("");
      setShowAddTaskDialog(false);
    }
  };

  const handleUpdateColumnName = async () => {
    if (editColumnName.trim() === column.name) {
      setShowEditColumnDialog(false);
      return;
    }
    if (!editColumnName.trim()) {
      toast({ variant: "destructive", title: "Erro", description: "O nome da coluna não pode ser vazio." });
      return;
    }

    const { error } = await supabase
      .from("task_columns")
      .update({ name: editColumnName })
      .eq("id", column.id);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao atualizar coluna", description: error.message });
    } else {
      onUpdateColumn({ ...column, name: editColumnName });
      toast({ title: "Coluna atualizada!" });
      setShowEditColumnDialog(false);
    }
  };

  return (
    <Card className="w-80 flex-shrink-0 bg-muted/40 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
          <CardTitle className="text-lg font-semibold">{column.name} ({tasks.length})</CardTitle>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowEditColumnDialog(true)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => onDeleteColumn(column.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <CardContent
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`p-3 min-h-[100px] ${snapshot.isDraggingOver ? 'bg-primary/10' : ''}`}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                onDuplicateTask={onDuplicateTask}
                storeId={storeId}
              />
            ))}
            {provided.placeholder}
          </CardContent>
        )}
      </Droppable>
      <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
        <DialogTrigger asChild>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-primary p-3">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Tarefa
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Tarefa em "{column.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Título da tarefa"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTaskDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddTask}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditColumnDialog} onOpenChange={setShowEditColumnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Coluna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Nome da coluna"
              value={editColumnName}
              onChange={(e) => setEditColumnName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateColumnName()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditColumnDialog(false)}>Cancelar</Button>
            <Button onClick={handleUpdateColumnName}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}