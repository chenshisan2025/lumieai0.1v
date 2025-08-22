import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface MedicalDisclaimerProps {
  className?: string;
}

export const MedicalDisclaimer: React.FC<MedicalDisclaimerProps> = ({ className = '' }) => {
  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">重要免责声明</p>
          <p>
            本应用提供的健康数据记录和勋章系统仅用于个人健康管理和激励目的。
            <strong>这些信息不构成医疗建议、诊断或治疗建议</strong>。
            如有健康问题，请咨询专业医疗人员。
          </p>
        </div>
      </div>
    </div>
  );
};

export default MedicalDisclaimer;