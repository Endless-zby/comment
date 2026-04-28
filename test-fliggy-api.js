const https = require('https');

const FLIGGY_HOTEL_ID = '50219710';
const PAGE = 1;
const PAGE_SIZE = 50;

const cookies = `_l_g_=Ug%3D%3D; _nk_=%5Cu697C%5Cu4E0B%5Cu5C0F%5Cu9ED1ai; _tb_token_=f0547b7b7b3ad; cancelledSubSites=empty; cna=3wpzImIitBYCAduP9OIN68j7; cookie1=Vve1PWePBmtBE%2FAB0thjCR3%2BdDb2KfUKGruIyYfKcVQ%3D; cookie17=UUtP%2FnK1RV9beg%3D%3D; cookie2=13126fb97fc0fed9678ba3e94e209f3c; csg=706b2dce; dnk=%5Cu697C%5Cu4E0B%5Cu5C0F%5Cu9ED1ai; havana_lgc_exp=1808185887521; lgc=; lid=%E6%A5%BC%E4%B8%8B%E5%B0%8F%E9%BB%91ai; login=true; sg=i55; sgcookie=E100LVuFJcWEEUhP2dm4waShU6qncJfQBCZRjw8OSXmwx0mZBwvA4%2BwWHgYNfBX7zUyCOY%2FxbSQOXAXs09N1KR9whIzB3lvIwXaBxD%2BZlsgcXeA6kkJKvvMENo4%2BIowKPj7MYy1cSwg3ELf2auIN46TlKA%3D%3D; sn=; t=7847123980e467df1209c8e564d9626f; tracknick=%5Cu697C%5Cu4E0B%5Cu5C0F%5Cu9ED1ai; uc1=pas=0&cookie14=UoYZbYrdsftdKQ%3D%3D&cookie15=W5iHLLyFOGW7aA%3D%3D&existShop=false&cookie21=V32FPkk%2FgihF%2FS5nr3O5&cookie16=VT5L2FSpNgq6fDudInPRgavC%2BQ%3D%3D; unb=2346214115; wk_cookie2=1b1e1ed34e6bb2d1fcff2cc33ecb08b5; wk_unb=UUtP%2FnK1RV9beg%3D%3D; xlly_s=1; chanelStat="NA=="; chanelStatExpire="2026-04-28 09:49:06"; VISITED_HOTEL_TOKEN=b019cdc8-29fe-4a95-ad6b-c731b61c84cd; mtop_partitioned_detect=1; _m_h5_tk=baa61f30e9e97389338b5edf18b1dbd9_1777262072547; _m_h5_tk_enc=baa5bbfc2de49e30854d434f7029b104; isg=BFRUAoDywenRslWngs_n1bdVJZLGrXiXguk40u40Hl752fAjF7gUJ28a2dHBIbDv; tfstk=gc4qcfOqYZQVy563TW0N42UPUcgx5VWIoPMss5ViGxD05qGM78H5MVZjCcba6YajhSgD_RPLLV6ABshi7-wosc4sCPRYzJ86ltIYsFusS96CRwNYaV3Gdyt_Cddx1fpmsdi0Z40s_WED7XVYMVdJNdjQqSQwUsLXoV2ir0cjOVxmjFfrrXlmSEmMo3voef0iSxcMq4csOExMSnfzZYhZSnx0I7fr1YDiSV2gZbGaHRpItmfVttw9_OSEkvVmUFYe9jmDmSK6-eX-GmGrqDTigzlq0vV0-YcGdb47zDiW1t3u9uwma272pjruTqcaW6xZQczxzYyF-Fh8m-zobz1OD7zZ3D4m4N5QTVlgIcrRLeGqluoUuoC9ES2I3k0Y1BWbaDrrvbmk_n0bAWatxrb2pYiK_8oQ0984KgoeBbj7oPE2IhomwbkCa_SADYcQ7016khKtqDcrdsnMXhnmwbkCa_-9XmLnav1xj`;

const timestamp = Date.now();
const ksTS = `${timestamp}_715`;
const callback = `jsonp716`;

const url = `https://hotel.alitrip.com/ajax/getHotelRates.htm?shid=${FLIGGY_HOTEL_ID}&showContent=0&rateScore=0&sort=1&page=${PAGE}&pageSize=${PAGE_SIZE}&_ksTS=${ksTS}&callback=${callback}`;

console.log('[Fliggy API Test] 测试直接调用飞猪评价API (pageSize=50)');
console.log(`[Fliggy API Test] URL: ${url}`);

const options = {
  headers: {
    'accept': 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01',
    'accept-language': 'zh-CN,zh;q=0.9,zh-TW;q=0.8,en-US;q=0.7,en;q=0.6',
    'cookie': cookies,
    'referer': `https://hotel.alitrip.com/hotel_detail2.htm?shid=${FLIGGY_HOTEL_ID}&_output_charset=utf8`,
    'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    'x-requested-with': 'XMLHttpRequest'
  }
};

https.get(url, options, (res) => {
  console.log(`[Fliggy API Test] 状态码: ${res.statusCode}`);
  console.log(`[Fliggy API Test] 响应头: ${JSON.stringify(res.headers, null, 2)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`[Fliggy API Test] 响应体长度: ${data.length}`);
    console.log(`[Fliggy API Test] 响应体前200字符: ${data.substring(0, 200)}`);
    
    try {
      let cleanData = data.trim();
      while (cleanData.startsWith('\n') || cleanData.startsWith('\r')) {
        cleanData = cleanData.slice(1);
      }
      cleanData = cleanData.trim();
      
      const jsonpMatch = cleanData.match(/^[a-zA-Z0-9_]+\((.+)\)$/s);
      if (jsonpMatch) {
        const json = JSON.parse(jsonpMatch[1]);
        console.log(`[Fliggy API Test] 解析成功！`);
        console.log(`[Fliggy API Test] code: ${json.code}`);
        console.log(`[Fliggy API Test] resultCount: ${json.resultCount}`);
        console.log(`[Fliggy API Test] goodCount: ${json.goodCount}`);
        console.log(`[Fliggy API Test] mediumCount: ${json.mediumCount}`);
        console.log(`[Fliggy API Test] badCount: ${json.badCount}`);
        console.log(`[Fliggy API Test] comments数量: ${json.comments?.length || 0}`);
        
        if (json.comments && json.comments.length > 0) {
          console.log(`[Fliggy API Test] 第一条评价:`);
          console.log(`  - 评分: ${json.comments[0].totalScore}`);
          console.log(`  - 内容: ${json.comments[0].content?.substring(0, 100)}`);
          console.log(`  - 日期: ${json.comments[0].date}`);
          console.log(`  - 用户: ${json.comments[0].user?.nick}`);
          
          console.log(`[Fliggy API Test] 第二条评价:`);
          console.log(`  - 评分: ${json.comments[1].totalScore}`);
          console.log(`  - 内容: ${json.comments[1].content?.substring(0, 100)}`);
          console.log(`  - 日期: ${json.comments[1].date}`);
        }
      } else {
        console.log(`[Fliggy API Test] 不是JSONP格式，尝试直接解析JSON`);
        const json = JSON.parse(cleanData);
        console.log(`[Fliggy API Test] JSON解析成功`);
      }
    } catch (e) {
      console.log(`[Fliggy API Test] 解析失败: ${e}`);
    }
  });
}).on('error', (e) => {
  console.log(`[Fliggy API Test] 请求错误: ${e.message}`);
});