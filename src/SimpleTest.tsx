import React from 'react';

export default function SimpleTest() {
  console.log('SimpleTest组件正在渲染...');
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-blue-600">🎉 系统测试成功！</h1>
      <div className="mt-4 p-4 bg-green-100 rounded-lg">
        <p className="text-green-800">
          如果您看到这个页面，说明React应用正在正常运行！
        </p>
        <p className="text-green-800 mt-2">
          当前时间: {new Date().toLocaleString()}
        </p>
        <p className="text-green-800 mt-2">
          页面URL: {window.location.href}
        </p>
      </div>
      
      <div className="mt-6 p-4 bg-blue-100 rounded-lg">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">下一步</h2>
        <p className="text-blue-800">
          现在可以访问完整的ERP系统了！请点击下面的链接：
        </p>
        <div className="mt-3 space-x-3">
          <a 
            href="/" 
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            访问完整ERP系统
          </a>
        </div>
      </div>
    </div>
  );
}