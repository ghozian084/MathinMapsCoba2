import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';

const PREDEFINED_TOOLS = ['Measuring Tape', 'Ruler', 'Clinometer'];

export default function TaskSetsTab() {
  const [taskSets, setTaskSets] = useState<any[]>([]);
  const [maps, setMaps] = useState<any[]>([]);
  const [mapPoints, setMapPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskSet, setEditingTaskSet] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    mapName: '',
    pointId: '',
    tasks: [] as any[]
  });

  useEffect(() => {
    const q = query(collection(db, 'taskSets'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTaskSets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'taskSets');
    });

    const mapsQ = query(collection(db, 'maps'));
    const unsubscribeMaps = onSnapshot(mapsQ, (snapshot) => {
      const mapsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setMaps(mapsData);
      if (mapsData.length > 0 && !formData.mapName) {
        setFormData(prev => ({ ...prev, mapName: mapsData[0].name }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'maps');
    });

    const pointsQ = query(collection(db, 'mapPoints'));
    const unsubscribePoints = onSnapshot(pointsQ, (snapshot) => {
      setMapPoints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'mapPoints');
    });

    return () => {
      unsubscribe();
      unsubscribeMaps();
      unsubscribePoints();
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const creatorName = auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown Admin';
      
      const tasksWithCreator = formData.tasks.map(task => ({
        ...task,
        creatorName: task.creatorName || creatorName
      }));

      const dataToSave = {
        ...formData,
        tasks: tasksWithCreator
      };

      if (editingTaskSet) {
        await updateDoc(doc(db, 'taskSets', editingTaskSet.id), dataToSave);
      } else {
        const newDocRef = doc(collection(db, 'taskSets'));
        await setDoc(newDocRef, { ...dataToSave, id: newDocRef.id });
      }
      setIsModalOpen(false);
      setEditingTaskSet(null);
      setFormData({ mapName: maps[0]?.name || '', pointId: '', tasks: [] });
    } catch (error) {
      handleFirestoreError(error, editingTaskSet ? OperationType.UPDATE : OperationType.CREATE, 'taskSets');
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      try {
        await deleteDoc(doc(db, 'taskSets', deleteConfirmId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `taskSets/${deleteConfirmId}`);
      }
      setDeleteConfirmId(null);
    }
  };

  const openEditModal = (taskSet: any) => {
    setEditingTaskSet(taskSet);
    setFormData({
      mapName: taskSet.mapName || maps[0]?.name || '',
      pointId: taskSet.pointId || '',
      tasks: taskSet.tasks || []
    });
    setIsModalOpen(true);
  };

  const addTask = () => {
    setFormData({
      ...formData,
      tasks: [
        ...formData.tasks,
        {
          taskNumber: formData.tasks.length + 1,
          name: '',
          objective: '',
          taskType: 'Short Answer',
          difficulty: 'Medium',
          about: '',
          hint1: '',
          hint2: '',
          tools: [],
          answerCriteria: { correctKeywords: [], correctOptionId: '', minVal: 0, maxVal: 0, options: [] }
        }
      ]
    });
  };

  const updateTask = (index: number, field: string, value: any) => {
    const newTasks = [...formData.tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setFormData({ ...formData, tasks: newTasks });
  };

  const handleToolToggle = (taskIndex: number, tool: string) => {
    const task = formData.tasks[taskIndex];
    const currentTools = task.tools || [];
    const newTools = currentTools.includes(tool)
      ? currentTools.filter((t: string) => t !== tool)
      : [...currentTools, tool];
    updateTask(taskIndex, 'tools', newTools);
  };

  const handleAddCustomTool = (taskIndex: number, toolName: string) => {
    if (!toolName.trim()) return;
    const task = formData.tasks[taskIndex];
    const currentTools = task.tools || [];
    if (!currentTools.includes(toolName.trim())) {
      updateTask(taskIndex, 'tools', [...currentTools, toolName.trim()]);
    }
  };

  const filteredPoints = mapPoints.filter(p => p.mapName === formData.mapName);

  if (loading) return <div>Loading task sets...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Task Sets</h3>
        <button
          onClick={() => {
            setEditingTaskSet(null);
            setFormData({ mapName: maps[0]?.name || '', pointId: '', tasks: [] });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Task Set
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Map Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Point ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {taskSets.map((ts) => (
              <tr key={ts.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ts.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ts.mapName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ts.pointId || 'None'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ts.tasks?.length || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => openEditModal(ts)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteConfirmId(ts.id)} className="text-red-600 hover:text-red-900">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!deleteConfirmId}
        title="Delete Task Set"
        message="Are you sure you want to delete this task set? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingTaskSet ? 'Edit Task Set' : 'Add New Task Set'}</h2>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Map Name</label>
                  <select
                    required
                    value={formData.mapName}
                    onChange={e => setFormData({...formData, mapName: e.target.value, pointId: ''})}
                    className="w-full p-2 border rounded"
                  >
                    {maps.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Point ID (Optional)</label>
                  <select
                    value={formData.pointId}
                    onChange={e => setFormData({...formData, pointId: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select a point...</option>
                    {filteredPoints.map(p => (
                      <option key={p.id} value={p.id}>{p.title || p.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
                  <button type="button" onClick={addTask} className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-200">
                    + Add Task
                  </button>
                </div>
                
                {formData.tasks.map((task, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                    <div className="flex justify-between mb-2">
                      <h4 className="font-medium">Task {task.taskNumber}</h4>
                      <button type="button" onClick={() => {
                        const newTasks = formData.tasks.filter((_, i) => i !== index);
                        setFormData({...formData, tasks: newTasks});
                      }} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name of Task</label>
                        <input type="text" required value={task.name || ''} onChange={e => updateTask(index, 'name', e.target.value)} className="w-full p-2 border rounded" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Objective of the Task</label>
                        <textarea required value={task.objective || ''} onChange={e => updateTask(index, 'objective', e.target.value)} className="w-full p-2 border rounded" rows={2}></textarea>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select type of Question</label>
                        <select value={task.taskType} onChange={e => updateTask(index, 'taskType', e.target.value)} className="w-full p-2 border rounded">
                          <option value="Short Answer">Short Answer</option>
                          <option value="Multiple Choice">Multiple Choice</option>
                          <option value="Interval">Interval</option>
                          <option value="Drag-and-Drop">Drag-and-Drop</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                        <select value={task.difficulty} onChange={e => updateTask(index, 'difficulty', e.target.value)} className="w-full p-2 border rounded">
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Task Image URL (Optional)</label>
                        <input type="text" value={task.taskImageUrl || ''} onChange={e => updateTask(index, 'taskImageUrl', e.target.value)} className="w-full p-2 border rounded" placeholder="https://..." />
                        {task.taskImageUrl && <img src={task.taskImageUrl} alt="Task Preview" className="h-20 object-cover mt-2 rounded border" />}
                      </div>

                      {/* Answer Criteria based on Task Type */}
                      <div className="col-span-2 bg-white p-3 border rounded">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Answer Configuration</h5>
                        {task.taskType === 'Short Answer' && (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Correct Keywords (comma separated)</label>
                              <input 
                                type="text" 
                                value={task.answerCriteria?.correctKeywords?.join(', ') || ''} 
                                onChange={e => updateTask(index, 'answerCriteria', { ...task.answerCriteria, correctKeywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                className="w-full p-2 border rounded text-sm" 
                                placeholder="e.g. apple, banana"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Minimum Keywords for Partial Match</label>
                              <input 
                                type="number" 
                                value={task.answerCriteria?.minKeywordsForPartialMatch || 1} 
                                onChange={e => updateTask(index, 'answerCriteria', { ...task.answerCriteria, minKeywordsForPartialMatch: parseInt(e.target.value) || 1 })}
                                className="w-full p-2 border rounded text-sm" 
                              />
                            </div>
                          </div>
                        )}
                        {task.taskType === 'Multiple Choice' && (
                          <div className="space-y-2">
                            <label className="block text-xs text-gray-500 mb-1">Options (comma separated)</label>
                            <input 
                              type="text" 
                              value={task.answerCriteria?.options?.join(', ') || ''} 
                              onChange={e => updateTask(index, 'answerCriteria', { ...task.answerCriteria, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                              className="w-full p-2 border rounded text-sm mb-2" 
                              placeholder="Option A, Option B, Option C"
                            />
                            <label className="block text-xs text-gray-500 mb-1">Correct Option (exact match)</label>
                            <input 
                              type="text" 
                              value={task.answerCriteria?.correctOptionId || ''} 
                              onChange={e => updateTask(index, 'answerCriteria', { ...task.answerCriteria, correctOptionId: e.target.value })}
                              className="w-full p-2 border rounded text-sm" 
                              placeholder="e.g. Option A"
                            />
                          </div>
                        )}
                        {task.taskType === 'Interval' && (
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Minimum Value</label>
                              <input 
                                type="number" 
                                value={task.answerCriteria?.minVal || 0} 
                                onChange={e => updateTask(index, 'answerCriteria', { ...task.answerCriteria, minVal: parseFloat(e.target.value) })}
                                className="w-full p-2 border rounded text-sm" 
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Maximum Value</label>
                              <input 
                                type="number" 
                                value={task.answerCriteria?.maxVal || 0} 
                                onChange={e => updateTask(index, 'answerCriteria', { ...task.answerCriteria, maxVal: parseFloat(e.target.value) })}
                                className="w-full p-2 border rounded text-sm" 
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Exact Value (Optional)</label>
                              <input 
                                type="number" 
                                value={task.answerCriteria?.exactVal || ''} 
                                onChange={e => updateTask(index, 'answerCriteria', { ...task.answerCriteria, exactVal: e.target.value ? parseFloat(e.target.value) : null })}
                                className="w-full p-2 border rounded text-sm" 
                                placeholder="e.g. 12"
                              />
                            </div>
                          </div>
                        )}
                        {task.taskType === 'Drag-and-Drop' && (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Draggable Items (comma separated)</label>
                              <input 
                                type="text" 
                                value={task.answerCriteria?.draggableItems?.join(', ') || ''} 
                                onChange={e => updateTask(index, 'answerCriteria', { ...task.answerCriteria, draggableItems: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                className="w-full p-2 border rounded text-sm" 
                                placeholder="Item 1, Item 2"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Target Areas (comma separated)</label>
                              <input 
                                type="text" 
                                value={task.answerCriteria?.targetAreas?.join(', ') || ''} 
                                onChange={e => updateTask(index, 'answerCriteria', { ...task.answerCriteria, targetAreas: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                className="w-full p-2 border rounded text-sm" 
                                placeholder="Target A, Target B"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Correct Pairs (JSON format)</label>
                              <textarea 
                                value={typeof task.answerCriteria?.correctPairs === 'string' ? task.answerCriteria.correctPairs : JSON.stringify(task.answerCriteria?.correctPairs || {})} 
                                onChange={e => {
                                  try {
                                    const parsed = JSON.parse(e.target.value);
                                    updateTask(index, 'answerCriteria', { ...task.answerCriteria, correctPairs: parsed });
                                  } catch (err) {
                                    // Allow invalid JSON while typing, store as string temporarily
                                    updateTask(index, 'answerCriteria', { ...task.answerCriteria, correctPairs: e.target.value });
                                  }
                                }}
                                className="w-full p-2 border rounded text-sm font-mono" 
                                rows={3}
                                placeholder='{"Item 1": "Target A", "Item 2": "Target B"}'
                              />
                              <p className="text-xs text-gray-400 mt-1">Must be valid JSON. Keys are draggable items, values are target areas.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hint 1</label>
                        <input type="text" required value={task.hint1 || ''} onChange={e => updateTask(index, 'hint1', e.target.value)} className="w-full p-2 border rounded" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hint 2 (Optional)</label>
                        <input type="text" value={task.hint2 || ''} onChange={e => updateTask(index, 'hint2', e.target.value)} className="w-full p-2 border rounded" />
                      </div>
                      
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">About the Task</label>
                        <textarea value={task.about || ''} onChange={e => updateTask(index, 'about', e.target.value)} className="w-full p-2 border rounded" rows={2}></textarea>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tools needed</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {PREDEFINED_TOOLS.map(tool => (
                            <label key={tool} className="flex items-center gap-1 text-sm bg-white border px-2 py-1 rounded cursor-pointer hover:bg-gray-50">
                              <input 
                                type="checkbox" 
                                checked={(task.tools || []).includes(tool)}
                                onChange={() => handleToolToggle(index, tool)}
                              />
                              {tool}
                            </label>
                          ))}
                          {(task.tools || []).filter((t: string) => !PREDEFINED_TOOLS.includes(t)).map((tool: string) => (
                            <span key={tool} className="flex items-center gap-1 text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded">
                              {tool}
                              <button type="button" onClick={() => handleToolToggle(index, tool)} className="hover:text-indigo-900"><X className="h-3 w-3" /></button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            id={`custom-tool-${index}`}
                            placeholder="Add custom tool..." 
                            className="flex-1 p-1.5 text-sm border rounded"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCustomTool(index, e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              const input = document.getElementById(`custom-tool-${index}`) as HTMLInputElement;
                              if (input) {
                                handleAddCustomTool(index, input.value);
                                input.value = '';
                              }
                            }}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-sm rounded border"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {task.creatorName && (
                        <div className="col-span-2 text-xs text-gray-500 text-right mt-2">
                          Creator: {task.creatorName}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded">Save Task Set</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
