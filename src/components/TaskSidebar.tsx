import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { X, HelpCircle, CheckCircle, XCircle, AlertCircle, Wrench, User } from 'lucide-react';

interface TaskSidebarProps {
  mapName: string;
  point: any;
  onClose: () => void;
}

export default function TaskSidebar({ mapName, point, onClose }: TaskSidebarProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<any>('');
  const [showHint1, setShowHint1] = useState(false);
  const [showHint2, setShowHint2] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; isPartial?: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<any>({
    feedbackMessages: {
      correct: "Excellent! You got it right.",
      partial: "You're on the right track, but refine your answer.",
      incorrect: "Not quite, try again."
    }
  });

  useEffect(() => {
    const fetchTasksAndSettings = async () => {
      try {
        // Fetch Settings
        const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data());
        }

        // Fetch Tasks
        let taskSetData = null;

        if (point.taskSetId) {
          const taskSetDoc = await getDoc(doc(db, 'taskSets', point.taskSetId));
          if (taskSetDoc.exists()) {
            taskSetData = taskSetDoc.data();
          }
        }

        if (!taskSetData) {
          const q = query(
            collection(db, 'taskSets'),
            where('pointId', '==', point.id)
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            taskSetData = snapshot.docs[0].data();
          }
        }

        if (taskSetData) {
          setTasks(taskSetData.tasks || []);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'taskSets/settings');
      } finally {
        setLoading(false);
      }
    };

    fetchTasksAndSettings();
  }, [point.id]);

  const currentTask = tasks[currentTaskIndex];

  const handleSubmit = async () => {
    if (!user || !currentTask) return;
    
    // Validate answer is not empty
    if (currentTask.taskType !== 'Drag-and-Drop' && (!userAnswer || (typeof userAnswer === 'string' && !userAnswer.trim()))) return;
    if (currentTask.taskType === 'Drag-and-Drop' && Object.keys(userAnswer || {}).length === 0) return;

    setSubmitting(true);
    try {
      let isCorrect = false;
      let isPartial = false;
      let message = '';

      if (currentTask.taskType === 'Short Answer') {
        const keywords = currentTask.answerCriteria?.correctKeywords || [];
        const minPartial = currentTask.answerCriteria?.minKeywordsForPartialMatch || 1;
        const answerLower = userAnswer.toLowerCase();
        
        let matchCount = 0;
        keywords.forEach((kw: string) => {
          if (answerLower.includes(kw.toLowerCase())) matchCount++;
        });

        if (matchCount === keywords.length && keywords.length > 0) {
          isCorrect = true;
        } else if (matchCount >= minPartial) {
          isPartial = true;
        }
      } else if (currentTask.taskType === 'Multiple Choice') {
        isCorrect = userAnswer === currentTask.answerCriteria?.correctOptionId;
      } else if (currentTask.taskType === 'Interval') {
        const val = parseFloat(userAnswer);
        const min = currentTask.answerCriteria?.minVal;
        const max = currentTask.answerCriteria?.maxVal;
        const exact = currentTask.answerCriteria?.exactVal;
        
        if (exact !== undefined && exact !== null && val === exact) {
          isCorrect = true;
        } else if (!isNaN(val) && val >= min && val <= max) {
          if (exact !== undefined && exact !== null) {
            isPartial = true; // Within range but not exact
          } else {
            isCorrect = true; // Only range was specified
          }
        }
      } else if (currentTask.taskType === 'Drag-and-Drop') {
        const correctPairs = currentTask.answerCriteria?.correctPairs || {};
        const totalPairs = Object.keys(correctPairs).length;
        let correctCount = 0;
        
        Object.keys(correctPairs).forEach(dragId => {
          if (userAnswer[dragId] === correctPairs[dragId]) {
            correctCount++;
          }
        });

        if (correctCount === totalPairs && totalPairs > 0) {
          isCorrect = true;
        } else if (correctCount > 0) {
          isPartial = true;
        }
      }

      if (isCorrect) {
        message = settings.feedbackMessages?.correct || "Excellent! You got it right.";
      } else if (isPartial) {
        message = settings.feedbackMessages?.partial || "You're on the right track, but refine your answer.";
      } else {
        message = settings.feedbackMessages?.incorrect || "Not quite, try again.";
      }

      setFeedback({ isCorrect, isPartial, message });

      // Save progress
      const newDocRef = doc(collection(db, 'userProgress'));
      await setDoc(newDocRef, {
        id: newDocRef.id,
        userId: user.uid,
        taskSetId: point.taskSetId || 'unknown',
        taskNumber: currentTask.taskNumber,
        userAnswer: typeof userAnswer === 'object' ? JSON.stringify(userAnswer) : userAnswer,
        aiFeedback: message,
        isCorrect,
        isPartial,
        timestamp: Date.now()
      });

    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'userProgress');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextTask = () => {
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
      setUserAnswer('');
      setFeedback(null);
      setShowHint1(false);
      setShowHint2(false);
    } else {
      onClose();
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (itemId) {
      setUserAnswer((prev: any) => ({
        ...(typeof prev === 'object' ? prev : {}),
        [itemId]: targetId
      }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (loading) {
    return (
      <div className="absolute top-0 right-0 h-full w-96 bg-white shadow-2xl z-30 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="absolute top-0 right-0 h-full w-96 bg-white shadow-2xl z-30 flex flex-col p-6">
        <button onClick={onClose} className="self-end text-gray-400 hover:text-gray-600">
          <X className="h-6 w-6" />
        </button>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No tasks available for this point.
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-white shadow-2xl z-30 flex flex-col transform transition-transform duration-300">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
        <div>
          <h2 className="text-lg font-bold text-indigo-900">{mapName}</h2>
          <p className="text-sm text-indigo-600">{point.title}</p>
        </div>
        <button onClick={onClose} className="text-indigo-400 hover:text-indigo-600 transition-colors">
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Task Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex justify-between items-center">
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Task {currentTaskIndex + 1} of {tasks.length}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            currentTask.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
            currentTask.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {currentTask.difficulty}
          </span>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">{currentTask.name}</h3>
        {currentTask.objective && (
          <p className="text-gray-600 mb-4 text-sm font-medium">{currentTask.objective}</p>
        )}
        
        {currentTask.taskImageUrl && (
          <img 
            src={currentTask.taskImageUrl} 
            alt="Task visual" 
            className="w-full rounded-lg mb-4 object-cover"
            referrerPolicy="no-referrer"
          />
        )}
        
        {currentTask.about && (
          <p className="text-gray-600 mb-6 bg-gray-50 p-4 rounded-lg text-sm border border-gray-100">
            {currentTask.about}
          </p>
        )}

        {/* Tools Section */}
        {currentTask.tools && currentTask.tools.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Tools Needed
            </h4>
            <div className="flex flex-wrap gap-2">
              {currentTask.tools.map((tool: string, idx: number) => (
                <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded border border-gray-200">
                  {tool}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Hint Section */}
        <div className="mb-6 space-y-2">
          {currentTask.hint1 && (
            <div>
              <button 
                onClick={() => setShowHint1(!showHint1)}
                className="flex items-center gap-2 text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
              >
                <HelpCircle className="h-4 w-4" />
                {showHint1 ? 'Hide Hint 1' : 'Show Hint 1'}
              </button>
              {showHint1 && (
                <div className="mt-2 p-3 bg-indigo-50 text-indigo-800 text-sm rounded-lg border border-indigo-100">
                  {currentTask.hint1}
                </div>
              )}
            </div>
          )}
          {currentTask.hint2 && (
            <div>
              <button 
                onClick={() => setShowHint2(!showHint2)}
                className="flex items-center gap-2 text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
              >
                <HelpCircle className="h-4 w-4" />
                {showHint2 ? 'Hide Hint 2' : 'Show Hint 2'}
              </button>
              {showHint2 && (
                <div className="mt-2 p-3 bg-indigo-50 text-indigo-800 text-sm rounded-lg border border-indigo-100">
                  {currentTask.hint2}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="mb-6">
          {currentTask.taskType === 'Short Answer' && (
            <input
              type="text"
              value={typeof userAnswer === 'string' ? userAnswer : ''}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              disabled={feedback?.isCorrect}
            />
          )}
          {currentTask.taskType === 'Interval' && (
            <input
              type="number"
              value={typeof userAnswer === 'string' ? userAnswer : ''}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Enter a number..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              disabled={feedback?.isCorrect}
            />
          )}
          {currentTask.taskType === 'Multiple Choice' && (
            <div className="space-y-2">
              {currentTask.answerCriteria?.options?.map((opt: string, idx: number) => (
                <label 
                  key={idx} 
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    userAnswer === opt ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                  } ${feedback?.isCorrect ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="mcq"
                    value={opt}
                    checked={userAnswer === opt}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    disabled={feedback?.isCorrect}
                  />
                  <span className="ml-3 text-gray-700">{opt}</span>
                </label>
              ))}
            </div>
          )}
          {currentTask.taskType === 'Drag-and-Drop' && (
            <div className="space-y-6">
              {/* Draggable Items */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Items to Place:</h4>
                <div className="flex flex-wrap gap-2">
                  {currentTask.answerCriteria?.draggableItems?.map((item: any) => {
                    // Check if item is already placed
                    const isPlaced = Object.values(userAnswer || {}).includes(item.id);
                    if (isPlaced) return null;

                    return (
                      <div
                        key={item.id}
                        draggable={!feedback?.isCorrect && !submitting}
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        className={`px-3 py-2 bg-white border border-gray-300 rounded shadow-sm cursor-move text-sm ${
                          feedback?.isCorrect || submitting ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-500 hover:shadow'
                        }`}
                      >
                        {item.text}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Target Areas */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Target Areas:</h4>
                {currentTask.answerCriteria?.targetAreas?.map((area: any) => {
                  // Find if any item is placed in this area
                  const placedItemId = Object.keys(userAnswer || {}).find(key => userAnswer[key] === area.id);
                  const placedItem = placedItemId 
                    ? currentTask.answerCriteria?.draggableItems?.find((i: any) => i.id === placedItemId)
                    : null;

                  return (
                    <div
                      key={area.id}
                      onDrop={(e) => handleDrop(e, area.id)}
                      onDragOver={handleDragOver}
                      className={`p-4 border-2 border-dashed rounded-lg transition-colors ${
                        placedItem ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-600 mb-2">{area.label}</div>
                      <div className="min-h-[40px] flex items-center justify-center">
                        {placedItem ? (
                          <div className="px-3 py-2 bg-white border border-indigo-500 rounded shadow-sm text-sm text-indigo-700 w-full text-center flex justify-between items-center">
                            <span>{placedItem.text}</span>
                            {(!feedback?.isCorrect && !submitting) && (
                              <button
                                onClick={() => {
                                  const newUserAnswer = { ...userAnswer };
                                  delete newUserAnswer[placedItemId];
                                  setUserAnswer(newUserAnswer);
                                }}
                                className="text-gray-400 hover:text-red-500 ml-2"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Drop item here</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Feedback Area */}
        {feedback && (
          <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            feedback.isCorrect ? 'bg-green-50 border border-green-200' : 
            feedback.isPartial ? 'bg-yellow-50 border border-yellow-200' :
            'bg-red-50 border border-red-200'
          }`}>
            {feedback.isCorrect ? (
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            ) : feedback.isPartial ? (
              <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className={`font-medium ${
                feedback.isCorrect ? 'text-green-800' : 
                feedback.isPartial ? 'text-yellow-800' :
                'text-red-800'
              }`}>
                {feedback.isCorrect ? 'Correct!' : feedback.isPartial ? 'Almost there!' : 'Incorrect'}
              </h4>
              <p className={`text-sm mt-1 ${
                feedback.isCorrect ? 'text-green-700' : 
                feedback.isPartial ? 'text-yellow-700' :
                'text-red-700'
              }`}>
                {feedback.message}
              </p>
            </div>
          </div>
        )}

        {/* Creator Info */}
        {currentTask.creatorName && (
          <div className="mt-8 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
            <User className="h-3 w-3" />
            Created by {currentTask.creatorName}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t border-gray-100 bg-gray-50">
        {!feedback?.isCorrect ? (
          <button
            onClick={handleSubmit}
            disabled={(currentTask.taskType !== 'Drag-and-Drop' && (!userAnswer || (typeof userAnswer === 'string' && !userAnswer.trim()))) || (currentTask.taskType === 'Drag-and-Drop' && Object.keys(userAnswer || {}).length === 0) || submitting}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        ) : (
          <button
            onClick={handleNextTask}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm"
          >
            {currentTaskIndex < tasks.length - 1 ? 'Next Task' : 'Finish & Return to Map'}
          </button>
        )}
      </div>
    </div>
  );
}
