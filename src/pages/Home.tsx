import React from 'react';
import { Link } from 'react-router-dom';
import { Award, Trophy, Star, Target, ArrowRight } from 'lucide-react';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              欢迎来到 <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">LUMIEAI</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              预见健康，奖励未来。通过完成健康任务获得独特的NFT勋章，记录您的健康成长历程。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/badges"
                className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-semibold rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Award className="h-5 w-5 mr-2" />
                查看我的勋章
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
              <Link
                to="/badges/admin"
                className="inline-flex items-center px-8 py-3 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-600 transition-all duration-200 border border-slate-600"
              >
                <Target className="h-5 w-5 mr-2" />
                管理勋章
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              勋章系统特色
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              通过区块链技术确保勋章的唯一性和永久性，让您的健康成就得到真正的认可。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-slate-700 hover:border-yellow-500/50 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center mb-6">
                <Award className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">NFT勋章收集</h3>
              <p className="text-gray-300">
                每个勋章都是独一无二的NFT，记录在区块链上，永久保存您的健康成就。
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-slate-700 hover:border-yellow-500/50 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center mb-6">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">稀有度系统</h3>
              <p className="text-gray-300">
                勋章分为普通、稀有、史诗、传说四个等级，完成更具挑战性的任务获得更稀有的勋章。
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-slate-700 hover:border-yellow-500/50 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center mb-6">
                <Star className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">自动铸造</h3>
              <p className="text-gray-300">
                系统自动监控您的健康数据，当达成条件时自动为您铸造相应的勋章。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Medical Disclaimer */}
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <MedicalDisclaimer />
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 rounded-2xl p-12 border border-yellow-500/20">
            <h2 className="text-3xl font-bold text-white mb-4">
              开始您的健康勋章之旅
            </h2>
            <p className="text-lg text-gray-300 mb-8">
              立即查看您已获得的勋章，或了解如何获得更多勋章奖励。
            </p>
            <Link
              to="/badges"
              className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-semibold rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Award className="h-5 w-5 mr-2" />
              进入勋章墙
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}