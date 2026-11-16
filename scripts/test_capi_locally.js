/**
 * Test script for Meta Conversions API (CAPI) local endpoint handler
 */

const handler = require('../api/capi.js');

async function runTest() {
  console.log('--- Testing GET /api/capi ---');
  let getStatus = 0;
  let getResponse = null;
  const mockGetReq = {
    method: 'GET',
    headers: {}
  };
  const mockGetRes = {
    setHeader: () => {},
    status: (code) => {
      getStatus = code;
      return {
        json: (data) => {
          getResponse = data;
        }
      };
    }
  };

  await handler(mockGetReq, mockGetRes);
  console.log('GET Status:', getStatus);
  console.log('GET Response:', JSON.stringify(getResponse, null, 2));

  console.log('\n--- Testing POST /api/capi with Test Event TEST64994 ---');
  let postStatus = 0;
  let postResponse = null;
  const mockPostReq = {
    method: 'POST',
    headers: {
      'x-forwarded-for': '103.230.106.12',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'cookie': '_fbp=fb.1.1710000000.123456789; _fbc=fb.1.1710000000.IwAR0'
    },
    body: {
      eventName: 'Purchase',
      eventId: 'ft_test_' + Date.now(),
      eventSourceUrl: 'https://farizasterritory.com/#/product/CAT-001',
      userData: {
        name: 'Saiful Islam',
        phone: '01712345678',
        district: 'Dhaka'
      },
      customData: {
        currency: 'BDT',
        value: 1850,
        content_name: 'Premium Swiss Lawn Three-Piece',
        content_ids: ['CAT-001'],
        num_items: 1,
        order_id: 'ORD-TEST-999'
      },
      test_event_code: 'TEST64994'
    }
  };

  const mockPostRes = {
    setHeader: () => {},
    status: (code) => {
      postStatus = code;
      return {
        json: (data) => {
          postResponse = data;
        }
      };
    }
  };

  await handler(mockPostReq, mockPostRes);
  console.log('POST Status:', postStatus);
  console.log('POST Response:', JSON.stringify(postResponse, null, 2));
}

runTest();
