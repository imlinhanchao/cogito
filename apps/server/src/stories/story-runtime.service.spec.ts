import { StoryRuntimeService } from './story-runtime.service';

describe('StoryRuntimeService', () => {
  const source = `标题：服务器故事

:: Start
(set: $score to 1)
(fn:"increment")[vars.score += Number(args[0] || 1); return vars.score]
当前分数：(print: $score)
[[继续|Next]](call:"increment" 2)

:: Next
最终分数：(print: $score)`;

  let service: StoryRuntimeService;

  beforeEach(() => {
    process.env.STORY_RUNTIME_AES_KEY = 'test-story-runtime-key';
    service = new StoryRuntimeService();
  });

  it('encrypts state and executes isolated functions before rendering the next passage', () => {
    const started = service.start('story-1', source);
    expect(started.html).toContain('当前分数：1');
    expect(started.dataset).not.toContain('当前分数');

    const advanced = service.execute(
      started.dataset,
      'Next',
      'call:"increment" 2',
    );
    expect(advanced.html).toContain('最终分数：3');
    expect(advanced.variables.score).toBe(3);
  });

  it('rejects modified datasets', () => {
    const started = service.start('story-1', source);
    expect(() => service.execute(`${started.dataset}x`)).toThrow(
      '无效或已过期的故事 dataset',
    );
  });
});
