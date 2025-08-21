import React from 'react';
import { useTaskScheduler } from '../hooks/useTaskScheduler';
import { Play, Pause, RefreshCw, Activity, Users, Clock, CheckCircle } from 'lucide-react';

const TaskSchedulerAdmin: React.FC = () => {
  const {
    isRunning,
    taskStatus,
    activityStats,
    startScheduler,
    stopScheduler,
    updateStatus,
    simulateLogin,
    simulateDataEntry,
    simulateGoalCompletion
  } = useTaskScheduler();

  const formatLastRun = (lastRun: Date) => {
    if (!lastRun || lastRun.getTime() === 0) {
      return '从未运行';
    }
    
    const now = new Date();
    const diff = now.getTime() - lastRun.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}天前`;
    } else if (hours > 0) {
      return `${hours}小时前`;
    } else if (minutes > 0) {
      return `${minutes}分钟前`;
    } else {
      return '刚刚';
    }
  };

  const formatInterval = (interval: number) => {
    const seconds = interval / 1000;
    const minutes = seconds / 60;
    const hours = minutes / 60;
    
    if (hours >= 1) {
      return `${hours}小时`;
    } else if (minutes >= 1) {
      return `${minutes}分钟`;
    } else {
      return `${seconds}秒`;
    }
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 rounded-lg shadow-xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">任务调度器管理</h1>
            <p className="text-blue-200">监控和管理自动化任务调度</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center px-4 py-2 rounded-lg ${
              isRunning ? 'bg-green-600' : 'bg-red-600'
            }`}>
              <div className={`w-3 h-3 rounded-full mr-2 ${
                isRunning ? 'bg-green-300 animate-pulse' : 'bg-red-300'
              }`}></div>
              <span className="text-white font-medium">
                {isRunning ? '运行中' : '已停止'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 控制面板 */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800 rounded-lg shadow-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <Activity className="w-6 h-6 mr-2 text-blue-400" />
              控制面板
            </h2>
            
            <div className="space-y-4">
              {/* 调度器控制 */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">调度器控制</h3>
                <div className="flex space-x-3">
                  <button
                    onClick={startScheduler}
                    disabled={isRunning}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    启动
                  </button>
                  <button
                    onClick={stopScheduler}
                    disabled={!isRunning}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    停止
                  </button>
                </div>
                <button
                  onClick={updateStatus}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  刷新状态
                </button>
              </div>

              {/* 模拟活动 */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">模拟用户活动</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => simulateLogin()}
                    className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    模拟登录
                  </button>
                  <button
                    onClick={() => simulateDataEntry()}
                    className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    模拟数据记录
                  </button>
                  <button
                    onClick={() => simulateGoalCompletion()}
                    className="w-full flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    模拟目标完成
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 活动统计 */}
          <div className="bg-slate-800 rounded-lg shadow-xl p-6 mt-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <Activity className="w-6 h-6 mr-2 text-green-400" />
              活动统计
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <span className="text-gray-300">总活动数</span>
                <span className="text-white font-bold">{activityStats.totalActivities}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <span className="text-gray-300">活跃用户</span>
                <span className="text-white font-bold">{activityStats.activeUsers}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <span className="text-gray-300">近期活动</span>
                <span className="text-white font-bold">{activityStats.recentActivities}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 任务状态 */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800 rounded-lg shadow-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <Clock className="w-6 h-6 mr-2 text-yellow-400" />
              任务状态
            </h2>
            
            <div className="space-y-4">
              {Object.entries(taskStatus).map(([taskId, status]) => (
                <div key={taskId} className="bg-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">{status.name}</h3>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        status.isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                      }`}></div>
                      <span className={`text-sm font-medium ${
                        status.isActive ? 'text-green-400' : 'text-gray-400'
                      }`}>
                        {status.isActive ? '活跃' : '非活跃'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">执行间隔:</span>
                      <div className="text-white font-medium">{formatInterval(status.interval)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">上次运行:</span>
                      <div className="text-white font-medium">{formatLastRun(status.lastRun)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">运行状态:</span>
                      <div className={`font-medium ${
                        status.isRunning ? 'text-yellow-400' : 'text-gray-300'
                      }`}>
                        {status.isRunning ? '执行中' : '空闲'}
                      </div>
                    </div>
                  </div>
                  
                  {status.isRunning && (
                    <div className="mt-3 flex items-center text-yellow-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent mr-2"></div>
                      <span className="text-sm">任务执行中...</span>
                    </div>
                  )}
                </div>
              ))}
              
              {Object.keys(taskStatus).length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-lg mb-2">暂无任务数据</div>
                  <p className="text-gray-500">请启动调度器或刷新状态</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 说明信息 */}
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 mt-8">
        <h2 className="text-xl font-bold text-white mb-4">功能说明</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
          <div>
            <h3 className="text-white font-semibold mb-2">连续性条件检查</h3>
            <p className="text-gray-400">每分钟检查用户的连续登录和数据记录情况，自动触发相应勋章的铸造。</p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">日常任务检查</h3>
            <p className="text-gray-400">每5分钟检查用户的日常目标完成情况和数据记录频率。</p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">成就条件检查</h3>
            <p className="text-gray-400">每小时检查用户的里程碑成就和特殊成就条件。</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskSchedulerAdmin;