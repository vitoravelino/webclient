/*
 * Copyright 2012 buddycloud
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define(function(require) {
  var $ = require(['jquery', 'timeago', 'jquery.embedly']);
  var _ = require('underscore')
  var avatarFallback = require('util/avatarFallback');
  var config = require('config');
  var Backbone = require('backbone');
  var Events = Backbone.Events;
  var linkify = require('util/linkify');
  var template = require('text!templates/content/post.html');

  var PostView = Backbone.View.extend({
    tagName: 'article',
    className: 'post',
    events: {
      'click .answer': '_expandAnswerArea',
      'click .createComment': '_comment',
      'click .avatar': '_redirect'
    },

    initialize: function() {
      this.model.bind('addComment', this.render, this);
    },

    render: function() {
      this.$el.html(_.template(template, {
        post: this.model,
        user: this.options.user,
        roleTag: this._roleTag.bind(this),
        linkify: linkify
      }));
      avatarFallback(this.$('.avatar'), 'personal', 50);
      this._showPostTime();
      this._embedly();
      this._addNoCommentsClassIfNeeded();
      this._adjustCommentAreaVisibility();
      this._commentOnCtrlEnter();
    },

    _showPostTime: function() {
      this.$('.postmeta').timeago();
    },

    _embedly: function() {
      this.$('p').embedly({
        maxWidth: 400, 
        key: config.embedlyKey, 
        secure: true, 
        success: function(oembed, dict) {
          var elem = dict.node;
          // If is not a link or if the link has an image
          return oembed && (oembed.type !== 'link' || oembed.code.indexOf('img') != -1) ?
            elem.replaceWith(oembed.code) : null;
        }
      });
    },

    _roleTag: function(username) {
      var role = this.options.channel.followers.get(username);
      if (role == 'owner' || role == 'moderator') {
        return role;
      } else {
        return '';
      }
    },

    _addNoCommentsClassIfNeeded: function() {
      if (this.model.length == 1) {
        this.$el.addClass('noComments');
      }
    },

    _adjustCommentAreaVisibility: function() {
      if (!this._userCanPost()) {
        this.$('.answer').remove();
      }
    },

    _userCanPost: function() {
      var user = this.options.user;
      if (user.isAnonymous()) {
        return false;
      } else {
        var channelName = this.options.channel.name;
        return user.subscribedChannels.isPostingAllowed(channelName);
      }
    },

    _commentOnCtrlEnter: function() {
      var self = this;
      this.$('.answer textarea').keyup(function(event) {
        if (event.ctrlKey && event.keyCode == 13 /* Enter */) {
          self._comment(event);
        }
      });
    },

    _expandAnswerArea: function(event) {
      event.stopPropagation();
      var area = this.$('.answer');
      if(!area.hasClass('write')){
        area.addClass('write');
        $(document).one('click', {self: this}, this._collapseAnswerArea);
      }
    },

    _collapseAnswerArea: function(event) {
      var area = event.data.self.$('.answer');
      var textArea = area.find('textarea');
      if(textArea.val() === ""){
        area.removeClass('write');
      }
    },

    _redirect: function(event) {
      var jid = this.$(event.currentTarget).parent().find('.jid').text();
      Events.trigger('navigate', jid);
    },

    _enableButton: function() {
      this.$('.createComment').removeClass('disabled').text('Post');
    },

    _disableButton: function() {
      this.$('.createComment').addClass('disabled').text('Posting...');
    },

    _comment: function(event) {
      event.stopPropagation();
      var textArea = this.$('.answer textarea');
      var content = textArea.val();
      var self = this;

      this._disableButton();

      var comment = this.options.channel.items.create({
        content: content,
        replyTo: this.model.id
      }, {
        credentials: this.options.user.credentials,
        wait: true,
        success: function() {
          textArea.val('');
          self._collapseAnswerArea({data: {self: self}});
          self._enableButton();
        }
      });
    }
  });

  return PostView;
});
