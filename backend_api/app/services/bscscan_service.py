import aiohttp
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime

from ..core.config import settings
from ..core.logging import get_logger, log_operation
from ..core.exceptions import ExternalServiceException, ValidationException

logger = get_logger("bscscan_service")

class BscScanService:
    """
    BscScan API服务类
    用于与BscScan API交互，获取BSC区块链交易信息
    """
    def __init__(self):
        self.api_key = settings.BSCSCAN_API_KEY
        self.base_url = "https://api.bscscan.com/api"
        self.logger = get_logger("bscscan_service")
        self.timeout = aiohttp.ClientTimeout(total=30)
        self.max_retries = 3
        self.retry_delay = 1.0
    
    async def _make_request(self, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        发送API请求的通用方法
        
        Args:
            params: 请求参数
            
        Returns:
            API响应数据或None
        """
        # 添加API密钥
        params['apikey'] = self.api_key
        last_exception = None
        
        for attempt in range(self.max_retries):
            try:
                self.logger.debug(f"Making BscScan API request (attempt {attempt + 1}/{self.max_retries})")
                
                async with aiohttp.ClientSession(timeout=self.timeout) as session:
                    async with session.get(self.base_url, params=params) as response:
                        if response.status == 200:
                            data = await response.json()
                            
                            # 检查API响应状态
                            if data.get("status") == "1":
                                self.logger.debug("BscScan API request successful")
                                return data
                            else:
                                error_msg = data.get("message", "Unknown error")
                                self.logger.error(f"BscScan API error: {error_msg}")
                                if "rate limit" in error_msg.lower():
                                    # 如果是速率限制，等待后重试
                                    self.logger.warning(f"Rate limit hit, waiting before retry...")
                                    await asyncio.sleep(2 ** attempt)
                                    continue
                                raise ExternalServiceException(f"BscScan API error: {error_msg}")
                        else:
                            error_text = await response.text()
                            self.logger.error(f"HTTP error {response.status}: {error_text}")
                            if attempt < self.max_retries - 1:
                                await asyncio.sleep(2 ** attempt)
                                continue
                            raise ExternalServiceException(f"HTTP error {response.status}: {error_text}")
                            
            except ExternalServiceException:
                raise
            except asyncio.TimeoutError as e:
                last_exception = e
                self.logger.error(f"Request timeout (attempt {attempt + 1}/{self.max_retries})")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                    
            except aiohttp.ClientError as e:
                last_exception = e
                self.logger.error(f"Network error (attempt {attempt + 1}/{self.max_retries}): {str(e)}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                    
            except Exception as e:
                last_exception = e
                self.logger.error(f"Unexpected error (attempt {attempt + 1}/{self.max_retries}): {str(e)}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                    
        self.logger.error(f"All {self.max_retries} retry attempts failed")
        if isinstance(last_exception, asyncio.TimeoutError):
            raise ExternalServiceException(f"BscScan API timeout after {self.max_retries} attempts")
        elif isinstance(last_exception, aiohttp.ClientError):
            raise ExternalServiceException(f"Network error after {self.max_retries} attempts: {str(last_exception)}")
        else:
            raise ExternalServiceException(f"BscScan API request failed after {self.max_retries} attempts: {str(last_exception)}")
    
    @log_operation("get_transaction_by_hash")
    async def get_transaction_by_hash(self, tx_hash: str) -> Optional[Dict[str, Any]]:
        """
        根据交易哈希获取交易详情
        
        Args:
            tx_hash: 交易哈希
            
        Returns:
            交易详情字典或None
        """
        if not tx_hash or not tx_hash.startswith('0x'):
            raise ValidationException(f"Invalid transaction hash format: {tx_hash}")
            
        self.logger.info(f"Getting transaction details for hash: {tx_hash}")
        
        try:
            params = {
                'module': 'proxy',
                'action': 'eth_getTransactionByHash',
                'txhash': tx_hash
            }
            
            response = await self._make_request(params)
            transaction = response.get('result')
            
            if not transaction:
                raise Exception(f"Transaction not found: {tx_hash}")
            
            # 格式化交易信息
            formatted_tx = {
                'hash': transaction.get('hash'),
                'blockNumber': int(transaction.get('blockNumber', '0'), 16),
                'blockHash': transaction.get('blockHash'),
                'transactionIndex': int(transaction.get('transactionIndex', '0'), 16),
                'from': transaction.get('from'),
                'to': transaction.get('to'),
                'value': int(transaction.get('value', '0'), 16),
                'gas': int(transaction.get('gas', '0'), 16),
                'gasPrice': int(transaction.get('gasPrice', '0'), 16),
                'input': transaction.get('input'),
                'nonce': int(transaction.get('nonce', '0'), 16)
            }
            
            return formatted_tx
            
        except Exception as e:
            logger.error(f"Error getting transaction {tx_hash}: {str(e)}")
            raise
    
    async def get_transaction_receipt(self, tx_hash: str) -> Dict[str, Any]:
        """
        获取交易收据信息
        
        Args:
            tx_hash: 交易哈希
            
        Returns:
            交易收据信息
        """
        try:
            params = {
                'module': 'proxy',
                'action': 'eth_getTransactionReceipt',
                'txhash': tx_hash
            }
            
            response = await self._make_request(params)
            receipt = response.get('result')
            
            if not receipt:
                raise Exception(f"Transaction receipt not found: {tx_hash}")
            
            # 格式化收据信息
            formatted_receipt = {
                'transactionHash': receipt.get('transactionHash'),
                'blockNumber': int(receipt.get('blockNumber', '0'), 16),
                'blockHash': receipt.get('blockHash'),
                'transactionIndex': int(receipt.get('transactionIndex', '0'), 16),
                'from': receipt.get('from'),
                'to': receipt.get('to'),
                'gasUsed': int(receipt.get('gasUsed', '0'), 16),
                'cumulativeGasUsed': int(receipt.get('cumulativeGasUsed', '0'), 16),
                'status': int(receipt.get('status', '0'), 16),
                'logs': receipt.get('logs', [])
            }
            
            return formatted_receipt
            
        except Exception as e:
            logger.error(f"Error getting transaction receipt {tx_hash}: {str(e)}")
            raise
    
    async def get_transaction_status(self, tx_hash: str) -> Dict[str, Any]:
        """
        获取交易状态信息
        
        Args:
            tx_hash: 交易哈希
            
        Returns:
            交易状态信息
        """
        try:
            params = {
                'module': 'transaction',
                'action': 'gettxreceiptstatus',
                'txhash': tx_hash
            }
            
            response = await self._make_request(params)
            status_info = response.get('result')
            
            if not status_info:
                raise Exception(f"Transaction status not found: {tx_hash}")
            
            return {
                'status': status_info.get('status'),
                'isError': status_info.get('status') != '1'
            }
            
        except Exception as e:
            logger.error(f"Error getting transaction status {tx_hash}: {str(e)}")
            raise
    
    async def get_block_by_number(self, block_number: int) -> Dict[str, Any]:
        """
        根据区块号获取区块信息
        
        Args:
            block_number: 区块号
            
        Returns:
            区块信息
        """
        try:
            params = {
                'module': 'proxy',
                'action': 'eth_getBlockByNumber',
                'tag': hex(block_number),
                'boolean': 'true'
            }
            
            response = await self._make_request(params)
            block = response.get('result')
            
            if not block:
                raise Exception(f"Block not found: {block_number}")
            
            # 格式化区块信息
            formatted_block = {
                'number': int(block.get('number', '0'), 16),
                'hash': block.get('hash'),
                'parentHash': block.get('parentHash'),
                'timestamp': int(block.get('timestamp', '0'), 16),
                'gasLimit': int(block.get('gasLimit', '0'), 16),
                'gasUsed': int(block.get('gasUsed', '0'), 16),
                'miner': block.get('miner'),
                'difficulty': int(block.get('difficulty', '0'), 16),
                'totalDifficulty': int(block.get('totalDifficulty', '0'), 16),
                'size': int(block.get('size', '0'), 16),
                'transactionCount': len(block.get('transactions', []))
            }
            
            return formatted_block
            
        except Exception as e:
            logger.error(f"Error getting block {block_number}: {str(e)}")
            raise
    
    async def get_latest_block_number(self) -> int:
        """
        获取最新区块号
        
        Returns:
            最新区块号
        """
        try:
            params = {
                'module': 'proxy',
                'action': 'eth_blockNumber'
            }
            
            response = await self._make_request(params)
            block_number_hex = response.get('result')
            
            if not block_number_hex:
                raise Exception("Failed to get latest block number")
            
            return int(block_number_hex, 16)
            
        except Exception as e:
            logger.error(f"Error getting latest block number: {str(e)}")
            raise
    
    async def get_account_balance(self, address: str) -> Dict[str, Any]:
        """
        获取账户BNB余额
        
        Args:
            address: 账户地址
            
        Returns:
            账户余额信息
        """
        try:
            params = {
                'module': 'account',
                'action': 'balance',
                'address': address,
                'tag': 'latest'
            }
            
            response = await self._make_request(params)
            balance_wei = response.get('result')
            
            if balance_wei is None:
                raise Exception(f"Failed to get balance for address: {address}")
            
            # 转换为BNB (1 BNB = 10^18 wei)
            balance_bnb = int(balance_wei) / (10 ** 18)
            
            return {
                'address': address,
                'balanceWei': balance_wei,
                'balanceBNB': balance_bnb
            }
            
        except Exception as e:
            logger.error(f"Error getting account balance {address}: {str(e)}")
            raise
    
    async def get_transaction_list(self, address: str, start_block: int = 0, 
                                 end_block: int = 99999999, page: int = 1, 
                                 offset: int = 10) -> List[Dict[str, Any]]:
        """
        获取账户交易列表
        
        Args:
            address: 账户地址
            start_block: 起始区块号
            end_block: 结束区块号
            page: 页码
            offset: 每页数量
            
        Returns:
            交易列表
        """
        try:
            params = {
                'module': 'account',
                'action': 'txlist',
                'address': address,
                'startblock': start_block,
                'endblock': end_block,
                'page': page,
                'offset': offset,
                'sort': 'desc'
            }
            
            response = await self._make_request(params)
            transactions = response.get('result', [])
            
            # 格式化交易列表
            formatted_txs = []
            for tx in transactions:
                formatted_tx = {
                    'hash': tx.get('hash'),
                    'blockNumber': int(tx.get('blockNumber', '0')),
                    'timeStamp': int(tx.get('timeStamp', '0')),
                    'from': tx.get('from'),
                    'to': tx.get('to'),
                    'value': int(tx.get('value', '0')),
                    'gas': int(tx.get('gas', '0')),
                    'gasPrice': int(tx.get('gasPrice', '0')),
                    'gasUsed': int(tx.get('gasUsed', '0')),
                    'isError': tx.get('isError') == '1',
                    'txreceipt_status': tx.get('txreceipt_status'),
                    'input': tx.get('input'),
                    'contractAddress': tx.get('contractAddress'),
                    'cumulativeGasUsed': int(tx.get('cumulativeGasUsed', '0')),
                    'confirmations': int(tx.get('confirmations', '0'))
                }
                formatted_txs.append(formatted_tx)
            
            return formatted_txs
            
        except Exception as e:
            logger.error(f"Error getting transaction list for {address}: {str(e)}")
            raise
    
    async def verify_transaction_data(self, tx_hash: str, expected_data: str) -> Dict[str, Any]:
        """
        验证交易中的数据是否匹配
        
        Args:
            tx_hash: 交易哈希
            expected_data: 期望的数据
            
        Returns:
            验证结果
        """
        try:
            # 获取交易详情
            transaction = await self.get_transaction_by_hash(tx_hash)
            
            # 获取交易收据
            receipt = await self.get_transaction_receipt(tx_hash)
            
            # 检查交易状态
            is_success = receipt.get('status') == 1
            
            # 检查输入数据
            input_data = transaction.get('input', '')
            data_matches = expected_data.lower() in input_data.lower() if expected_data else True
            
            return {
                'txHash': tx_hash,
                'isSuccess': is_success,
                'dataMatches': data_matches,
                'blockNumber': transaction.get('blockNumber'),
                'gasUsed': receipt.get('gasUsed'),
                'timestamp': None,  # 需要额外查询区块信息获取时间戳
                'from': transaction.get('from'),
                'to': transaction.get('to'),
                'value': transaction.get('value')
            }
            
        except Exception as e:
            logger.error(f"Error verifying transaction data {tx_hash}: {str(e)}")
            raise
    
    async def get_gas_price(self) -> Dict[str, Any]:
        """
        获取当前Gas价格
        
        Returns:
            Gas价格信息
        """
        try:
            params = {
                'module': 'proxy',
                'action': 'eth_gasPrice'
            }
            
            response = await self._make_request(params)
            gas_price_hex = response.get('result')
            
            if not gas_price_hex:
                raise Exception("Failed to get gas price")
            
            gas_price_wei = int(gas_price_hex, 16)
            gas_price_gwei = gas_price_wei / (10 ** 9)
            
            return {
                'gasPriceWei': gas_price_wei,
                'gasPriceGwei': gas_price_gwei,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting gas price: {str(e)}")
            raise
    
    def get_transaction_url(self, tx_hash: str) -> str:
        """
        获取BscScan交易查看URL
        
        Args:
            tx_hash: 交易哈希
            
        Returns:
            BscScan URL
        """
        return f"https://bscscan.com/tx/{tx_hash}"
    
    def get_address_url(self, address: str) -> str:
        """
        获取BscScan地址查看URL
        
        Args:
            address: 地址
            
        Returns:
            BscScan URL
        """
        return f"https://bscscan.com/address/{address}"
    
    def get_block_url(self, block_number: int) -> str:
        """
        获取BscScan区块查看URL
        
        Args:
            block_number: 区块号
            
        Returns:
            BscScan URL
        """
        return f"https://bscscan.com/block/{block_number}"
    
    async def health_check(self) -> Dict[str, Any]:
        """
        健康检查
        
        Returns:
            服务状态信息
        """
        try:
            # 尝试获取最新区块号来测试API连接
            latest_block = await self.get_latest_block_number()
            
            return {
                'status': 'healthy',
                'latestBlock': latest_block,
                'apiKey': 'configured' if self.api_key else 'missing',
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"BscScan health check failed: {str(e)}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'apiKey': 'configured' if self.api_key else 'missing',
                'timestamp': datetime.utcnow().isoformat()
            }

# 创建全局实例
bscscan_service = BscScanService()