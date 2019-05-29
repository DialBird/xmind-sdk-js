import { Workbook, Topic, Marker } from '../../src';
import * as chai from 'chai';
import * as fs from 'fs';
import * as JSZip from 'jszip';
import Core = require('xmind-model');

const expect = chai.expect;

const getComponents = function() {
  const workbook = new Workbook();
  const topic = new Topic({sheet: workbook.createSheet('sheet1', 'centralTopic')});
  return {topic, workbook};
}


describe('# Functional Test', () => {
  describe('# Entries', () => {
    it('the sheet should be created and has rootTopic', done => {
      const workbook = new Workbook();
      const sheet = workbook.createSheet('sheet1');
      expect(sheet instanceof Core.Sheet).to.be.true;
      expect(sheet.getRootTopic()).to.be.not.null;
      done();
    });

    it('the topic should be created and has .on .add etc. ', done => {
      const workbook = new Workbook();
      const sheet = workbook.createSheet('sheet1');
      const topic = new Topic({sheet});
      expect(topic instanceof Topic).to.be.true;
      expect(topic).to.have.property('on');
      expect(topic).to.have.property('add');
      expect(topic).to.have.property('note');
      done();
    });
  });

  describe('# Topic', () => {
    it('should be a lots of main topic added to rootTopic', done => {
      const topics = ['main topic 1', 'main topic 2', 'main topic 3', 'main topic 4'];
      const {workbook, topic} = getComponents();
      topic.add({title: 'main topic 1'})
        .add({title: 'main topic 2'})
        .add({title: 'main topic 3'})
        .add({title: 'main topic 4'});

      const children = workbook.toJSON()[0].rootTopic.children.attached;
      for (let i = 0; i < children.length; i++) {
        expect(children[i]).to.have.property('title');
        expect(children[i]).to.have.property('id');
        expect(topics).to.include(children[i].title);
      }
      done();
    });

    it('should be subtopic added on main topic 1', done => {
      const {workbook, topic} = getComponents();
      topic.add({title: 'main topic 1'});

      const children = workbook.toJSON()[0].rootTopic.children.attached;
      expect(children[0]).to.have.property('title').that.to.be.eq('main topic 1');
      expect(children[0]).to.have.property('id');

      topic
        .on('main topic 1')
        .add({title: 'subtopic 1'})
        .add({title: 'subtopic 2'})
        .add({title: 'subtopic 3'});

      const subtopics = workbook.toJSON()[0].rootTopic.children.attached[0].children.attached;
      for(let i = 0; i < subtopics.length; i++) {
        expect(subtopics[i].title.startsWith('subtopic')).to.be.true;
        expect(subtopics[i].id).to.not.be.empty;
      }
      done();
    });

    it('should be subtopic removed', done => {
      const {workbook, topic} = getComponents();
      topic.add({title: 'main topic 1'});

      const children = workbook.toJSON()[0].rootTopic.children.attached;
      expect(children[0]).to.have.property('title').that.to.be.eq('main topic 1');
      expect(children[0]).to.have.property('id');

      topic
        .on('main topic 1')
        .add({title: 'subtopic 1'})
        .add({title: 'subtopic 2'})
        .add({title: 'subtopic 3'})
        .destroy('subtopic 2');


      topic.destroy('subtopic 2');

      const subtopics = workbook.toJSON()[0].rootTopic.children.attached[0].children.attached;
      expect(subtopics.length).to.be.eq(2);
      for(let i = 0; i < subtopics.length; i++) {
        expect(subtopics[i].title.startsWith('subtopic')).to.be.true;
        expect(subtopics[i].id).to.not.be.empty;
      }
      done();
    });

    it('should be topic found by title', done => {
      const {topic} = getComponents();
      topic.add({title: 'main topic 1'});
      const mainTopic1 = topic.find('main topic 1');
      expect(mainTopic1).to.not.be.empty;
      done();
    });

    it('should be default.xmind file saved to /tmp/default.xmind', done => {
      const p = '/tmp/default.xmind';
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }

      const workbook = new Workbook();
      const sheet = workbook.createSheet('sheet1', 'centralTopic');
      const topic = new Topic({sheet});
      topic
        .add({title: 'main topic 1'})
        .add({title: 'main topic 1111'})
        .add({title: 'main topic 222'})
        .add({title: 'main topic 11'});

      topic
        .on('main topic 1111')
        .add({title: 'subtopic 1111'});

      topic
        .on('main topic 1')
        .add({title: 'subtopic 1'});

      topic
        .on('main topic 222')
        .note('add note to main topic 222')
        .add({title: 'subtopic 222 with a note'})
        .on('subtopic 222 with a note')
        .note('this is the note with');

      workbook.zipper.save().then((status) => {
        expect(status).to.be.true;
        expect(fs.existsSync(p)).to.be.true;
        fs.unlinkSync(p);
        done();
      });
    });

    it('should be a topic destroyed', done => {
      const {topic, workbook} = getComponents();
      const destroyedTopic = 'main topic 2';
      topic
        .add({title: 'main topic 1'})
        .add({title: 'main topic 2'})
        .add({title: 'main topic 3'});

      topic.destroy(destroyedTopic);
      workbook.zipper.save().then(async status => {
        expect(status).to.be.true;
        const p = '/tmp/default.xmind';
        const content = fs.readFileSync(p);
        JSZip.loadAsync(content).then(async zip => {
          const text = await zip.file('content.json').async('text');
          const map = JSON.parse(text)[0];
          expect(map).to.be.an('object');
          const {attached} = map.rootTopic.children;
          expect(attached.length).to.be.eq(2);
          expect(attached.find(child => child.title === destroyedTopic)).to.be.undefined;
          fs.unlinkSync(p);
          done();
        });
      });
    });

  });

  describe('# Note', () => {});

  describe('# Marker', () => {

    it('should be failed to add marker', done => {
      const {topic} = getComponents();
      const title = 'main topic 1';
      topic
        .add({title})
        .on(title)
        // @ts-ignore
        .marker({})
        // @ts-ignore
        .marker();
      done();
    });

    it('should be one of smiley marker flag added', done => {
      const {topic, workbook} = getComponents();
      const marker = new Marker();
      const title = 'main topic 1';
      topic
        .add({title})
        .on(title)
        .marker(marker.smiley('cry'));
      workbook.zipper.save().then(status => {
        expect(status).to.be.true;
        const p = '/tmp/default.xmind';
        const content = fs.readFileSync(p);
        JSZip.loadAsync(content).then(async zip => {
          const text = await zip.file('content.json').async('text');
          const map = JSON.parse(text)[0];
          expect(map).to.be.an('object');
          const {attached} = map.rootTopic.children
          expect(attached).to.be.an('array');
          expect(attached.find(child => child.title === title)).to.have.property('markers').that.to.be.an('array');
          fs.unlinkSync(p);
          done();
        });
      });
    });
  });

  describe('# Summary', () => {
    it('should be a summary object added that contains 1 main topic and 2 subtopics', done => {
      const {topic, workbook} = getComponents();

      topic
        .add({title: 'main topic 1'})
        .on('main topic 1')
        .add({title: 'subtopic 1'})
        .add({title: 'subtopic 2'})
        .summary({title: 'Test Summary'});

      workbook.zipper.save().then(status => {
        expect(status).to.be.true;
        const p = '/tmp/default.xmind';
        const content = fs.readFileSync(p);
        JSZip.loadAsync(content).then(async zip => {
          const text = await zip.file('content.json').async('text');
          const map = JSON.parse(text)[0];
          expect(map).to.be.an('object');
          expect(map).to.have.property('rootTopic');
          expect(map.rootTopic).to.have.property('summaries');
          expect(map.rootTopic.summaries[0]).to.have.property('range').that.to.be.an('string');
          // contains 1 main topic
          // (0,0)
          // 1st: 0 - that's meaning where is the element start at children list
          // 2nd: 0 - that's meaning where is the element end at children list
          expect(map.rootTopic.summaries[0].range).to.eq('(0,0)');
          fs.unlinkSync(p);
          done();
        });
      });
    });


    it('should be a summary object added that contains 2 main topic and 3 subtopics', done => {
      const {topic, workbook} = getComponents();

      topic
        .add({title: 'main topic 1'})
        .add({title: 'main topic 2'})
        .add({title: 'main topic 3'})
        .on('main topic 1')
        .add({title: 'subtopic 1'})
        .add({title: 'subtopic 2'})
        .on('main topic 2')
        .add({title: 'subtopic 1'})

        .on('main topic 1') /* position topic title */
        .summary({title: 'Test Summary', include: 'main topic 2'});

      workbook.zipper.save().then(status => {
        expect(status).to.be.true;
        const p = '/tmp/default.xmind';
        const content = fs.readFileSync(p);
        JSZip.loadAsync(content).then(async zip => {
          const text = await zip.file('content.json').async('text');
          const map = JSON.parse(text)[0];
          expect(map).to.be.an('object');
          expect(map.rootTopic.summaries[0].range).to.eq('(0,1)');
          fs.unlinkSync(p);
          done();
        });
      });
    });

    it('only contains 1 main topic if given a invalid range topic name', done => {
      const {topic, workbook} = getComponents();

      topic
        .add({title: 'main topic 1'})
        .add({title: 'main topic 2'})
        .add({title: 'main topic 3'})
        .on('main topic 1')
        .add({title: 'subtopic 1'})
        .add({title: 'subtopic 2'})
        .on('main topic 2')
        .add({title: 'subtopic 1'})

        .on('main topic 1') /* position topic title */
        .summary({title: 'Test Summary', include: 'main topic does not exists'});

      workbook.zipper.save().then(status => {
        expect(status).to.be.true;
        const p = '/tmp/default.xmind';
        const content = fs.readFileSync(p);
        JSZip.loadAsync(content).then(async zip => {
          const text = await zip.file('content.json').async('text');
          const map = JSON.parse(text)[0];
          expect(map).to.be.an('object');
          expect(map.rootTopic.summaries[0].range).to.eq('(0,0)');
          fs.unlinkSync(p);
          done();
        });
      });
    });

    it('only contains start position if the index position (start > end)', done => {
      const {topic, workbook} = getComponents();
      topic
        .add({title: 'main topic 1'})
        .add({title: 'main topic 2'})
        .add({title: 'main topic 3'})
        .on('main topic 1')
        .add({title: 'subtopic 1'})
        .add({title: 'subtopic 2'})
        .on('main topic 2')
        .add({title: 'subtopic 1'})

        .on('main topic 3') /* position topic title */
        .summary({title: 'Test Summary', include: 'main topic 1'});

      workbook.zipper.save().then(status => {
        expect(status).to.be.true;
        const p = '/tmp/default.xmind';
        const content = fs.readFileSync(p);
        JSZip.loadAsync(content).then(async zip => {
          const text = await zip.file('content.json').async('text');
          const map = JSON.parse(text)[0];
          expect(map).to.be.an('object');
          expect(map.rootTopic.summaries[0].range).to.eq('(2,2)');
          fs.unlinkSync(p);
          done();
        });
      });
    });

  });

});